import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Package, ExternalLink, Trash2, FileText, Building2, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const materialSchema = z.object({
  name: z.string().min(1, "Material name is required"),
  category: z.string().min(1, "Category is required"),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  specification: z.string().optional(),
  notes: z.string().optional(),
  quantity: z.string().optional(),
  unitCost: z.number().optional(),
  totalCost: z.number().optional(),
  supplier: z.string().optional(),
  status: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

interface Material {
  id: string;
  projectId: string;
  name: string;
  category: string;
  link?: string;
  specification?: string;
  notes?: string;
  quantity?: string;
  unitCost?: number;
  totalCost?: number;
  supplier?: string;
  status?: string;
  addedBy: string;
  createdAt: string;
}

const MATERIAL_CATEGORIES = [
  { value: "bathrooms", label: "🚿 Bathrooms" },
  { value: "kitchen", label: "🍳 Kitchen" },
  { value: "bedrooms", label: "🛏️ Bedrooms" },
  { value: "living_rooms", label: "🛋️ Living Rooms" },
  { value: "exterior", label: "🏠 Exterior" },
  { value: "flooring", label: "🧱 Flooring" },
  { value: "electrical", label: "⚡ Electrical" },
  { value: "plumbing", label: "🔧 Plumbing" },
  { value: "hvac", label: "🌡️ HVAC" },
  { value: "general", label: "📦 General" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "📋 Pending" },
  { value: "ordered", label: "📞 Ordered" },
  { value: "delivered", label: "🚚 Delivered" },
  { value: "installed", label: "✅ Installed" },
  { value: "on_hold", label: "⏸️ On Hold" },
];

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
      category: "general",
      link: "",
      specification: "",
      notes: "",
      quantity: "",
      unitCost: undefined,
      totalCost: undefined,
      supplier: "",
      status: "pending",
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
          category: data.category,
          link: data.link || null,
          specification: data.specification || null,
          notes: data.notes || null,
          quantity: data.quantity || null,
          unitCost: data.unitCost || null,
          totalCost: data.totalCost || null,
          supplier: data.supplier || null,
          status: data.status || "pending",
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material Name *</FormLabel>
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
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-material-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MATERIAL_CATEGORIES.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 500 sq ft, 10 units"
                            {...field}
                            data-testid="input-material-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-material-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="unitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Cost</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            data-testid="input-material-unit-cost"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Cost</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            data-testid="input-material-total-cost"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Home Depot, Lowes, etc."
                            {...field}
                            data-testid="input-material-supplier"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Link</FormLabel>
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
                      <FormLabel>Specifications</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Material specifications, dimensions, brand preferences..."
                          className="min-h-[80px]"
                          {...field}
                          data-testid="textarea-material-spec"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes, special requirements, installation notes..."
                          className="min-h-[80px]"
                          {...field}
                          data-testid="textarea-material-notes"
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
        <MaterialsDatabase materials={materials} onRemove={handleRemoveMaterial} isRemoving={removeMaterialMutation.isPending} />
      )}
    </div>
  );
}

// Helper function to group materials by category
function groupMaterialsByCategory(materials: Material[]) {
  return materials.reduce((acc, material) => {
    const category = material.category || "general";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(material);
    return acc;
  }, {} as Record<string, Material[]>);
}

// Helper function to get category display info
function getCategoryInfo(categoryValue: string) {
  return MATERIAL_CATEGORIES.find(cat => cat.value === categoryValue) || 
         { value: categoryValue, label: `📦 ${categoryValue}` };
}

// Helper function to get status display info
function getStatusInfo(statusValue: string) {
  return STATUS_OPTIONS.find(status => status.value === statusValue) || 
         { value: statusValue, label: `📋 ${statusValue}` };
}

interface MaterialsDatabaseProps {
  materials: Material[];
  onRemove: (id: string) => void;
  isRemoving: boolean;
}

function MaterialsDatabase({ materials, onRemove, isRemoving }: MaterialsDatabaseProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const groupedMaterials = groupMaterialsByCategory(materials);
  
  // Calculate totals
  const totalCost = materials.reduce((sum, material) => sum + (material.totalCost || 0), 0);
  const categoryCounts = Object.entries(groupedMaterials).map(([category, items]) => ({
    category,
    count: items.length,
    info: getCategoryInfo(category)
  }));

  // Filter materials based on selected category
  const filteredMaterials = selectedCategory === "all" ? materials : groupedMaterials[selectedCategory] || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{materials.length}</p>
                <p className="text-sm text-muted-foreground">Total Materials</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-teal-500" />
              <div>
                <p className="text-2xl font-bold">{Object.keys(groupedMaterials).length}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 lg:grid-cols-11">
          <TabsTrigger value="all" className="text-xs">
            All ({materials.length})
          </TabsTrigger>
          {MATERIAL_CATEGORIES.map((category) => {
            const count = groupedMaterials[category.value]?.length || 0;
            return (
              <TabsTrigger key={category.value} value={category.value} className="text-xs">
                {category.label.split(' ')[0]} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {filteredMaterials.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Materials in {selectedCategory === "all" ? "Any Category" : getCategoryInfo(selectedCategory).label}
                  </h3>
                  <p className="text-muted-foreground">
                    Add materials to this category to see them here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-8 gap-4 p-4 bg-muted/50 rounded-lg font-medium text-sm">
                <div className="col-span-2">Material & Category</div>
                <div>Quantity</div>
                <div>Unit Cost</div>
                <div>Total Cost</div>
                <div>Status</div>
                <div>Supplier</div>
                <div>Actions</div>
              </div>

              {/* Material Rows */}
              {filteredMaterials.map((material) => (
                <Card key={material.id} data-testid={`card-material-${material.id}`}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-start">
                      {/* Material & Category */}
                      <div className="col-span-1 md:col-span-2">
                        <div className="flex flex-col gap-2">
                          <div>
                            <h3 className="font-semibold text-lg">{material.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {getCategoryInfo(material.category).label}
                              </Badge>
                            </div>
                          </div>
                          {(material.specification || material.notes) && (
                            <div className="text-sm text-muted-foreground space-y-1">
                              {material.specification && (
                                <p><span className="font-medium">Spec:</span> {material.specification}</p>
                              )}
                              {material.notes && (
                                <p><span className="font-medium">Notes:</span> {material.notes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="flex flex-col">
                        <span className="md:hidden text-xs font-medium text-muted-foreground">Quantity</span>
                        <span className="text-sm">{material.quantity || "—"}</span>
                      </div>

                      {/* Unit Cost */}
                      <div className="flex flex-col">
                        <span className="md:hidden text-xs font-medium text-muted-foreground">Unit Cost</span>
                        <span className="text-sm">
                          {material.unitCost ? `$${material.unitCost.toFixed(2)}` : "—"}
                        </span>
                      </div>

                      {/* Total Cost */}
                      <div className="flex flex-col">
                        <span className="md:hidden text-xs font-medium text-muted-foreground">Total Cost</span>
                        <span className="text-sm font-medium">
                          {material.totalCost ? `$${material.totalCost.toFixed(2)}` : "—"}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="flex flex-col">
                        <span className="md:hidden text-xs font-medium text-muted-foreground">Status</span>
                        <Badge variant="outline" className="w-fit text-xs">
                          {getStatusInfo(material.status || "pending").label}
                        </Badge>
                      </div>

                      {/* Supplier */}
                      <div className="flex flex-col">
                        <span className="md:hidden text-xs font-medium text-muted-foreground">Supplier</span>
                        <span className="text-sm">{material.supplier || "—"}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {material.link && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(material.link, '_blank')}
                            data-testid={`button-view-link-${material.id}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="md:hidden ml-1">View</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRemove(material.id)}
                          disabled={isRemoving}
                          data-testid={`button-remove-${material.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="md:hidden ml-1">Remove</span>
                        </Button>
                      </div>
                    </div>

                    {/* Mobile metadata */}
                    <div className="md:hidden mt-3 pt-3 border-t text-xs text-muted-foreground">
                      Added {new Date(material.createdAt).toLocaleDateString()} by User {material.addedBy.slice(0, 8)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}