import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, AlertTriangle, CheckCircle, Camera, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";

const issueSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  photos: z.array(z.string()).max(3, "Maximum 3 photos allowed"),
});

type IssueFormData = z.infer<typeof issueSchema>;

interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string;
  photos: string[];
  createdBy: string;
  status: "open" | "closed";
  createdAt: string;
}

interface IssuesTabProps {
  projectId: string;
}

export function IssuesTab({ projectId }: IssuesTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      title: "",
      description: "",
      photos: [],
    },
  });

  // Get issues for the project
  const { data: issues = [], isLoading } = useQuery<Issue[]>({
    queryKey: [`/api/client-issues?project_id=${projectId}`],
    enabled: !!projectId,
  });

  // Create issue mutation
  const createIssueMutation = useMutation({
    mutationFn: async (data: IssueFormData) => {
      const res = await apiRequest(`/api/client-issues`, {
        method: "POST",
        body: {
          project_id: projectId,
          title: data.title,
          description: data.description,
          // photos will be handled separately via attachments
        },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-issues?project_id=${projectId}`] });
      toast({
        title: "Issue Created",
        description: "Your issue has been submitted successfully.",
      });
      form.reset();
      setUploadedPhotos([]);
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create issue. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Close issue mutation
  const closeIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await apiRequest(`/api/client-issues/${issueId}?status=closed`, {
        method: "PATCH",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-issues?project_id=${projectId}`] });
      toast({
        title: "Issue Closed",
        description: "The issue has been marked as resolved.",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("/api/objects/upload", {
      method: "POST",
    });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (uploadedUrls: string[]) => {
    const totalPhotos = [...uploadedPhotos, ...uploadedUrls];
    
    if (totalPhotos.length > 3) {
      toast({
        title: "Photo Limit Exceeded",
        description: "Maximum 3 photos allowed per issue.",
        variant: "destructive",
      });
      return;
    }
    
    setUploadedPhotos(totalPhotos);
    form.setValue("photos", totalPhotos);
  };

  const removePhoto = (index: number) => {
    const newPhotos = uploadedPhotos.filter((_, i) => i !== index);
    setUploadedPhotos(newPhotos);
    form.setValue("photos", newPhotos);
  };

  const onSubmit = (data: IssueFormData) => {
    createIssueMutation.mutate({
      ...data,
      photos: uploadedPhotos,
    });
  };

  const getStatusColor = (status: string) => {
    return status === "open" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800";
  };

  const getStatusIcon = (status: string) => {
    return status === "open" ? AlertTriangle : CheckCircle;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Issues</h2>
          <p className="text-muted-foreground">
            Report issues and track their resolution status
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-issue">
              <Plus className="h-4 w-4 mr-2" />
              Report Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Report New Issue</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Brief description of the issue" 
                          {...field} 
                          data-testid="input-issue-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detailed description of the issue..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-issue-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Photo Upload */}
                <div className="space-y-4">
                  <FormLabel>Photos (Optional, max 3)</FormLabel>
                  
                  {uploadedPhotos.length < 3 && (
                    <ObjectUploader
                      maxNumberOfFiles={3 - uploadedPhotos.length}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete}
                      buttonClassName="w-full"
                    >
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        <span>Upload Photos ({uploadedPhotos.length}/3)</span>
                      </div>
                    </ObjectUploader>
                  )}

                  {/* Photo Preview */}
                  {uploadedPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                      {uploadedPhotos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo}
                            alt={`Issue photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => removePhoto(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    data-testid="button-cancel-issue"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createIssueMutation.isPending}
                    data-testid="button-submit-issue"
                  >
                    {createIssueMutation.isPending ? "Creating..." : "Create Issue"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Issues List */}
      {isLoading ? (
        <div className="text-center py-8">Loading issues...</div>
      ) : issues.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertTriangle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Issues Reported</h3>
              <p className="text-muted-foreground mb-4">
                Get started by reporting your first issue for this project.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {issues.map((issue) => {
            const StatusIcon = getStatusIcon(issue.status);
            return (
              <Card key={issue.id} data-testid={`card-issue-${issue.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{issue.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created {new Date(issue.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(issue.status)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {issue.status}
                      </Badge>
                      {issue.status === "open" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => closeIssueMutation.mutate(issue.id)}
                          disabled={closeIssueMutation.isPending}
                          data-testid={`button-close-${issue.id}`}
                        >
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {issue.description}
                  </p>
                  
                  {/* Photo Gallery */}
                  {issue.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {issue.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Issue photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}