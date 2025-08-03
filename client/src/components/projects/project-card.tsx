import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Calendar, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project } from "@shared/schema";

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onViewDetails?: (project: Project) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-brand-teal/10 text-brand-teal";
    case "completed":
      return "bg-green-100 text-green-800";
    case "delayed":
      return "bg-red-100 text-red-800";
    case "on-hold":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getProgressColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-brand-teal";
    case "completed":
      return "bg-green-500";
    case "delayed":
      return "bg-red-500";
    case "on-hold":
      return "bg-gray-500";
    default:
      return "bg-blue-500";
  }
};

export default function ProjectCard({ 
  project, 
  onEdit, 
  onDelete, 
  onViewDetails 
}: ProjectCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle 
            className="text-lg construction-secondary group-hover:text-blue-600 transition-colors"
            onClick={() => onViewDetails?.(project)}
          >
            {project.name}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(project.status)}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails?.(project)}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(project)}>
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete?.(project)}
                  className="text-red-600"
                >
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <MapPin size={14} className="mr-1" />
          {project.location}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {project.description || "No description provided"}
        </p>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(project.status)}`}
                style={{ width: `${project.progress}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-500">
              <Calendar size={14} className="mr-1" />
              <span>
                {project.dueDate 
                  ? `Due ${new Date(project.dueDate).toLocaleDateString()}`
                  : "No due date"
                }
              </span>
            </div>
            
            <div className="flex items-center text-gray-500">
              <Users size={14} className="mr-1" />
              <span>Teams</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
            <span className={`px-2 py-1 rounded-full ${
              project.progress >= 75 ? "bg-green-100 text-green-800" :
              project.progress >= 50 ? "bg-blue-100 text-blue-800" :
              project.progress >= 25 ? "bg-brand-teal/10 text-brand-teal" :
              "bg-red-100 text-red-800"
            }`}>
              {project.progress >= 75 ? "Near completion" :
               project.progress >= 50 ? "On track" :
               project.progress >= 25 ? "In progress" :
               "Getting started"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
