import express from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { 
  projectHealthMetrics, 
  riskAssessments, 
  healthCheckTemplates,
  projects,
  tasks
} from "@shared/schema";

const router = express.Router();

// Get all project health metrics
router.get("/project-health-metrics", async (req, res) => {
  try {
    const metrics = await db
      .select()
      .from(projectHealthMetrics)
      .orderBy(projectHealthMetrics.calculatedAt);
    
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching project health metrics:", error);
    res.status(500).json({ error: "Failed to fetch project health metrics" });
  }
});

// Get project health metrics for a specific project
router.get("/project-health-metrics/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const metrics = await db
      .select()
      .from(projectHealthMetrics)
      .where(eq(projectHealthMetrics.projectId, projectId))
      .orderBy(projectHealthMetrics.calculatedAt)
      .limit(1);
    
    res.json(metrics[0] || null);
  } catch (error) {
    console.error("Error fetching project health metrics:", error);
    res.status(500).json({ error: "Failed to fetch project health metrics" });
  }
});

// Create/update project health metrics
router.post("/project-health-metrics", async (req, res) => {
  try {
    const metrics = await db
      .insert(projectHealthMetrics)
      .values(req.body)
      .returning();
    
    res.json(metrics[0]);
  } catch (error) {
    console.error("Error creating project health metrics:", error);
    res.status(500).json({ error: "Failed to create project health metrics" });
  }
});

// Calculate health metrics for a project
router.post("/project-health-metrics/:projectId/calculate", async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Fetch project and related tasks
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    
    // Calculate health metrics based on actual data
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
    const overdueTasks = projectTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
    ).length;
    const criticalTasks = projectTasks.filter(t => t.priority === 'critical').length;
    const blockedTasks = projectTasks.filter(t => t.status === 'blocked').length;
    
    // Calculate health scores (0-100)
    const scheduleHealth = totalTasks > 0 
      ? Math.max(0, 100 - (overdueTasks / totalTasks) * 100)
      : 100;
    
    const qualityHealth = totalTasks > 0
      ? Math.max(0, 100 - (blockedTasks / totalTasks) * 100)
      : 100;
    
    const resourceHealth = totalTasks > 0
      ? Math.max(0, 100 - (criticalTasks / totalTasks) * 50)
      : 100;
    
    // Budget health (simplified - based on project progress vs time elapsed)
    const budgetHealth = project.progress || 80; // Simplified calculation
    
    // Overall health (weighted average)
    const overallHealthScore = Math.round(
      (scheduleHealth * 0.3 + budgetHealth * 0.25 + qualityHealth * 0.25 + resourceHealth * 0.2)
    );
    
    // Determine risk level
    let riskLevel = "low";
    if (overallHealthScore < 40) riskLevel = "critical";
    else if (overallHealthScore < 60) riskLevel = "high";
    else if (overallHealthScore < 80) riskLevel = "medium";
    
    const healthData = {
      projectId,
      overallHealthScore,
      scheduleHealth: Math.round(scheduleHealth),
      budgetHealth: Math.round(budgetHealth),
      qualityHealth: Math.round(qualityHealth),
      resourceHealth: Math.round(resourceHealth),
      riskLevel
    };
    
    // Insert new metrics
    const metrics = await db
      .insert(projectHealthMetrics)
      .values(healthData)
      .returning();
    
    res.json(metrics[0]);
  } catch (error) {
    console.error("Error calculating project health metrics:", error);
    res.status(500).json({ error: "Failed to calculate project health metrics" });
  }
});

// Get all risk assessments
router.get("/risk-assessments", async (req, res) => {
  try {
    const risks = await db
      .select()
      .from(riskAssessments)
      .orderBy(riskAssessments.createdAt);
    
    res.json(risks);
  } catch (error) {
    console.error("Error fetching risk assessments:", error);
    res.status(500).json({ error: "Failed to fetch risk assessments" });
  }
});

// Get risk assessments for a specific project
router.get("/risk-assessments/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const risks = await db
      .select()
      .from(riskAssessments)
      .where(eq(riskAssessments.projectId, projectId))
      .orderBy(riskAssessments.createdAt);
    
    res.json(risks);
  } catch (error) {
    console.error("Error fetching risk assessments:", error);
    res.status(500).json({ error: "Failed to fetch risk assessments" });
  }
});

// Create a new risk assessment
router.post("/risk-assessments", async (req, res) => {
  try {
    const riskData = {
      ...req.body,
      identifiedBy: "sample-user-id", // In real app, get from auth
    };
    
    // Calculate risk score (1-25)
    const probabilityScore = riskData.probability === "high" ? 5 : 
                           riskData.probability === "medium" ? 3 : 1;
    const impactScore = riskData.impact === "high" ? 5 : 
                       riskData.impact === "medium" ? 3 : 1;
    
    riskData.riskScore = probabilityScore * impactScore;
    
    const risk = await db
      .insert(riskAssessments)
      .values(riskData)
      .returning();
    
    res.json(risk[0]);
  } catch (error) {
    console.error("Error creating risk assessment:", error);
    res.status(500).json({ error: "Failed to create risk assessment" });
  }
});

// Update a risk assessment
router.patch("/risk-assessments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const risk = await db
      .update(riskAssessments)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(riskAssessments.id, id))
      .returning();
    
    if (risk.length === 0) {
      return res.status(404).json({ error: "Risk assessment not found" });
    }
    
    res.json(risk[0]);
  } catch (error) {
    console.error("Error updating risk assessment:", error);
    res.status(500).json({ error: "Failed to update risk assessment" });
  }
});

// Delete a risk assessment
router.delete("/risk-assessments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db
      .delete(riskAssessments)
      .where(eq(riskAssessments.id, id))
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({ error: "Risk assessment not found" });
    }
    
    res.json({ message: "Risk assessment deleted successfully" });
  } catch (error) {
    console.error("Error deleting risk assessment:", error);
    res.status(500).json({ error: "Failed to delete risk assessment" });
  }
});

// Get health check templates
router.get("/health-check-templates", async (req, res) => {
  try {
    const templates = await db
      .select()
      .from(healthCheckTemplates)
      .where(eq(healthCheckTemplates.isActive, true))
      .orderBy(healthCheckTemplates.createdAt);
    
    res.json(templates);
  } catch (error) {
    console.error("Error fetching health check templates:", error);
    res.status(500).json({ error: "Failed to fetch health check templates" });
  }
});

export default router;