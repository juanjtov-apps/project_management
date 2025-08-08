import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Plus } from "lucide-react";
import { insertRiskAssessmentSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import type { Project } from "@shared/schema";

const riskFormSchema = insertRiskAssessmentSchema.extend({
  dueDate: z.date().optional().nullable(),
});

type RiskFormData = z.infer<typeof riskFormSchema>;

interface AddRiskDialogProps {
  projectId: string;
  projects?: Project[];
  trigger?: React.ReactNode;
}

export default function AddRiskDialog({ projectId, projects = [], trigger }: AddRiskDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RiskFormData>({
    resolver: zodResolver(riskFormSchema),
    defaultValues: {
      projectId: projectId,
      riskType: "schedule",
      probability: "medium",
      impact: "medium",
      status: "identified",
      riskTitle: "",
      riskDescription: "",
      mitigationPlan: "",
      assignedTo: "",
      dueDate: null,
    },
  });

  const createRiskMutation = useMutation({
    mutationFn: async (data: RiskFormData) => {
      const response = await apiRequest("/api/risk-assessments", {
        method: "POST",
        body: {
          ...data,
          dueDate: data.dueDate ? data.dueDate.toISOString() : null,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-assessments"] });
      toast({
        title: "Success",
        description: "Risk assessment created successfully",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create risk assessment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RiskFormData) => {
    createRiskMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-brand-teal hover:bg-brand-teal/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Risk
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl" aria-describedby="add-risk-description">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Add Risk Assessment</span>
          </DialogTitle>
          <DialogDescription id="add-risk-description">
            Identify and assess potential risks for this project.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="riskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="schedule">Schedule</SelectItem>
                        <SelectItem value="budget">Budget</SelectItem>
                        <SelectItem value="quality">Quality</SelectItem>
                        <SelectItem value="resource">Resource</SelectItem>
                        <SelectItem value="weather">Weather</SelectItem>
                        <SelectItem value="safety">Safety</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="riskTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the risk" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="riskDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detailed Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Provide a detailed description of the risk and its potential consequences"
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probability</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select probability" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low (10-30%)</SelectItem>
                        <SelectItem value="medium">Medium (30-70%)</SelectItem>
                        <SelectItem value="high">High (70-90%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Likelihood that this risk will occur
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="impact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impact</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select impact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low - Minor impact</SelectItem>
                        <SelectItem value="medium">Medium - Moderate impact</SelectItem>
                        <SelectItem value="high">High - Severe impact</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Severity of consequences if risk occurs
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="mitigationPlan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mitigation Plan</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the plan to mitigate or respond to this risk"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Steps to prevent or minimize the impact of this risk
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createRiskMutation.isPending}
                className="bg-brand-teal hover:bg-brand-teal/90"
              >
                {createRiskMutation.isPending ? "Creating..." : "Create Risk Assessment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}