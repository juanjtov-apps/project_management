import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Package, ExternalLink, Trash2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const materialSchema = z.object({
  name: z.string().min(1, "Material name is required"),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  specification: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

interface Material {
  id: string;
  projectId: string;
  name: string;
  link?: string;
  specification?: string;
  addedBy: string;
  createdAt: string;
}

interface MaterialsTabProps {
  projectId: string;
}

export function MaterialsTab({ projectId }: MaterialsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: "",
      link: "",
      specification: "",
    },
  });

  // Get materials for the project
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["/api/client-materials", projectId],
    enabled: !!projectId,
  });

  // Create material mutation
  const createMaterialMutation = useMutation({
    mutationFn: async (data: MaterialFormData) => {
      return apiRequest(`/projects/${projectId}/materials`, {
        method: "POST",
        body: JSON.stringify({
          projectId,
          name: data.name,
          link: data.link || null,
          specification: data.specification || null,
          addedBy: "current-user", // This should come from auth context
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-materials", projectId] });
      toast({
        title: "Material Added",
        description: "Material has been added to the project list.",
      });
      form.reset();
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to add material. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Remove material mutation
  const removeMaterialMutation = useMutation({
    mutationFn: async (materialId: string) => {
      return apiRequest(`/materials/${materialId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-materials", projectId] });
      toast({
        title: "Material Removed",
        description: "Material has been removed from the project list.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to remove material. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MaterialFormData) => {
    createMaterialMutation.mutate(data);
  };

  const handleRemoveMaterial = (materialId: string) => {
    if (confirm("Are you sure you want to remove this material?")) {
      removeMaterialMutation.mutate(materialId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Material List</h2>
          <p className="text-muted-foreground">
            Collaborate on materials needed for the project
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-material">
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Material</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Hardwood Flooring, Paint, etc." 
                          {...field} 
                          data-testid="input-material-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Link (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/product"
                          {...field}
                          data-testid="input-material-link"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specifications (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Material specifications, dimensions, brand preferences..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-material-spec"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    data-testid="button-cancel-material"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMaterialMutation.isPending}
                    data-testid="button-submit-material"
                  >
                    {createMaterialMutation.isPending ? "Adding..." : "Add Material"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Materials List */}
      {isLoading ? (
        <div className="text-center py-8">Loading materials...</div>
      ) : materials.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Materials Added</h3>
              <p className="text-muted-foreground mb-4">
                Start building your material list for this project.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Material
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {materials.map((material) => (
            <Card key={material.id} data-testid={`card-material-${material.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{material.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Added {new Date(material.createdAt).toLocaleDateString()} by User {material.addedBy.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {material.link && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(material.link, '_blank')}
                        data-testid={`button-view-link-${material.id}`}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveMaterial(material.id)}
                      disabled={removeMaterialMutation.isPending}
                      data-testid={`button-remove-${material.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {material.specification && (
                <CardContent>
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium mb-1">Specifications:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {material.specification}
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}