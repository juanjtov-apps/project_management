import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, Package, ExternalLink, Trash2, ChevronDown, ChevronRight, 
  Pencil, Check, X, DollarSign, Search, Building2, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Schema for creating an area
const areaSchema = z.object({
  name: z.string().min(1, "Area name is required"),
  description: z.string().optional(),
});

// Schema for creating a material item
const materialItemSchema = z.object({
  name: z.string().min(1, "Material name is required"),
  spec: z.string().optional(),
  product_link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  vendor: z.string().optional(),
  quantity: z.string().optional(),
  unit_cost: z.number().optional(),
});

type AreaFormData = z.infer<typeof areaSchema>;
type MaterialItemFormData = z.infer<typeof materialItemSchema>;

interface MaterialArea {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  item_count: number;
  total_cost: number;
}

interface MaterialItem {
  id: string;
  area_id: string;
  project_id: string;
  name: string;
  spec?: string;
  product_link?: string;
  vendor?: string;
  quantity?: string;
  unit_cost?: number;
  status: string;
  added_by: string;
  added_by_name?: string;
  created_at: string;
  updated_at: string;
}

interface MaterialsTabProps {
  projectId: string;
}

export function MaterialsTab({ projectId }: MaterialsTabProps) {
  const [isCreateAreaOpen, setIsCreateAreaOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const areaForm = useForm<AreaFormData>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Get material areas for the project
  const { data: areas = [], isLoading: areasLoading } = useQuery<MaterialArea[]>({
    queryKey: [`/api/material-areas?project_id=${projectId}`],
    enabled: !!projectId,
  });

  // Get all material items for the project
  const { data: allItems = [], isLoading: itemsLoading } = useQuery<MaterialItem[]>({
    queryKey: [`/api/material-items?project_id=${projectId}`],
    enabled: !!projectId,
  });

  // Create area mutation
  const createAreaMutation = useMutation({
    mutationFn: async (data: AreaFormData) => {
      const response = await apiRequest(`/api/material-areas`, {
        method: "POST",
        body: {
          project_id: projectId,
          name: data.name,
          description: data.description || null,
          sort_order: areas.length,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      toast({
        title: "Area Created",
        description: "New material area has been created successfully.",
      });
      areaForm.reset();
      setIsCreateAreaOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create area. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmitArea = (data: AreaFormData) => {
    createAreaMutation.mutate(data);
  };

  // Filter items based on search
  const filteredItems = allItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.spec?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate totals
  const totalItems = allItems.length;
  const totalCost = allItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity || "0") || 1;
    const cost = item.unit_cost || 0;
    return sum + (qty * cost);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Materials by Area</h2>
          <p className="text-muted-foreground">
            Organize materials by house area with collapsible sections
          </p>
        </div>
        
        <Dialog open={isCreateAreaOpen} onOpenChange={setIsCreateAreaOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-area">
              <Plus className="h-4 w-4 mr-2" />
              Add Area
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Material Area</DialogTitle>
            </DialogHeader>
            
            <Form {...areaForm}>
              <form onSubmit={areaForm.handleSubmit(onSubmitArea)} className="space-y-4">
                <FormField
                  control={areaForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Foundation, Framing, Electrical" 
                          {...field} 
                          data-testid="input-area-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={areaForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Optional description for this area..."
                          className="min-h-[80px]"
                          {...field}
                          data-testid="textarea-area-description"
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
                    onClick={() => setIsCreateAreaOpen(false)}
                    data-testid="button-cancel-area"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createAreaMutation.isPending}
                    data-testid="button-submit-area"
                  >
                    {createAreaMutation.isPending ? "Creating..." : "Create Area"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{areas.length}</p>
                <p className="text-sm text-muted-foreground">Material Areas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-teal-500" />
              <div>
                <p className="text-2xl font-bold">{totalItems}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
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
                <p className="text-sm text-muted-foreground">Estimated Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search materials by name, spec, or vendor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-materials"
        />
      </div>

      {/* Areas List */}
      {areasLoading ? (
        <div className="text-center py-8">Loading areas...</div>
      ) : areas.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Areas Created</h3>
              <p className="text-muted-foreground mb-4">
                Create your first material area to organize materials by house section.
              </p>
              <Button onClick={() => setIsCreateAreaOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Area
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {areas.map((area) => (
            <MaterialAreaSection
              key={area.id}
              area={area}
              items={filteredItems.filter(item => item.area_id === area.id)}
              projectId={projectId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MaterialAreaSectionProps {
  area: MaterialArea;
  items: MaterialItem[];
  projectId: string;
}

function MaterialAreaSection({ area, items, projectId }: MaterialAreaSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isDeleteAreaDialogOpen, setIsDeleteAreaDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const itemForm = useForm<MaterialItemFormData>({
    resolver: zodResolver(materialItemSchema),
    defaultValues: {
      name: "",
      spec: "",
      product_link: "",
      vendor: "",
      quantity: "",
      unit_cost: undefined,
    },
  });

  // Calculate area totals
  const areaCost = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity || "0") || 1;
    const cost = item.unit_cost || 0;
    return sum + (qty * cost);
  }, 0);

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: MaterialItemFormData) => {
      const response = await apiRequest(`/api/material-items`, {
        method: "POST",
        body: {
          area_id: area.id,
          project_id: projectId,
          name: data.name,
          spec: data.spec || null,
          product_link: data.product_link || null,
          vendor: data.vendor || null,
          quantity: data.quantity || null,
          unit_cost: data.unit_cost || null,
          status: "pending",
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      toast({
        title: "Item Added",
        description: "Material item has been added successfully.",
      });
      itemForm.reset();
      setIsAddingItem(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiRequest(`/api/material-items/${itemId}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      toast({
        title: "Item Deleted",
        description: "Material item has been removed.",
      });
    },
  });

  const onSubmitItem = (data: MaterialItemFormData) => {
    createItemMutation.mutate(data);
  };

  // Delete area mutation
  const deleteAreaMutation = useMutation({
    mutationFn: async (areaId: string) => {
      const response = await apiRequest(`/api/material-areas/${areaId}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      toast({
        title: "Area Deleted",
        description: "Material area and all its items have been removed.",
      });
    },
  });

  const handleDeleteItem = (itemId: string) => {
    setItemToDelete(itemId);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      deleteItemMutation.mutate(itemToDelete);
      setItemToDelete(null);
    }
  };

  const handleDeleteArea = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent collapsible toggle
    setIsDeleteAreaDialogOpen(true);
  };

  const confirmDeleteArea = () => {
    deleteAreaMutation.mutate(area.id);
    setIsDeleteAreaDialogOpen(false);
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between p-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-accent/50 transition-colors rounded-lg p-2 -m-2">
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{area.name}</h3>
                {area.description && (
                  <p className="text-sm text-muted-foreground">{area.description}</p>
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Badge>
            <div className="text-sm font-medium text-green-600 dark:text-green-400">
              ${areaCost.toFixed(2)}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteArea}
              data-testid={`button-delete-area-${area.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {/* Items List */}
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item) => (
                  <MaterialItemRow
                    key={item.id}
                    item={item}
                    onDelete={handleDeleteItem}
                    projectId={projectId}
                  />
                ))}
              </div>
            )}

            {/* Add Item Form */}
            {isAddingItem ? (
              <Card className="border-2 border-dashed">
                <CardContent className="p-4">
                  <Form {...itemForm}>
                    <form onSubmit={itemForm.handleSubmit(onSubmitItem)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Material Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 2x4 Lumber" {...field} data-testid="input-item-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={itemForm.control}
                          name="vendor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vendor</FormLabel>
                              <FormControl>
                                <Input placeholder="Home Depot, Lowes..." {...field} data-testid="input-item-vendor" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={itemForm.control}
                        name="spec"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specifications</FormLabel>
                            <FormControl>
                              <Input placeholder="Dimensions, brand, model..." {...field} data-testid="input-item-spec" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="product_link"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Link</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} data-testid="input-item-link" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 50, 100 sq ft" {...field} data-testid="input-item-quantity" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={itemForm.control}
                          name="unit_cost"
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
                                  data-testid="input-item-cost"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            itemForm.reset();
                            setIsAddingItem(false);
                          }}
                          data-testid="button-cancel-item"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          size="sm"
                          disabled={createItemMutation.isPending}
                          data-testid="button-submit-item"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {createItemMutation.isPending ? "Adding..." : "Add Item"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() => setIsAddingItem(true)}
                data-testid={`button-add-item-${area.id}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item to {area.name}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Delete Area Confirmation Dialog */}
      <AlertDialog open={isDeleteAreaDialogOpen} onOpenChange={setIsDeleteAreaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Material Area
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>"{area.name}"</strong>?
              </p>
              {items.length > 0 && (
                <p className="text-destructive font-medium">
                  This will also permanently delete all {items.length} {items.length === 1 ? 'item' : 'items'} in this area.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteArea}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-area"
            >
              Delete Area
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Material Item
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this material item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-item"
            >
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

interface MaterialItemRowProps {
  item: MaterialItem;
  onDelete: (id: string) => void;
  projectId: string;
}

function MaterialItemRow({ item, onDelete, projectId }: MaterialItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const editForm = useForm<MaterialItemFormData>({
    resolver: zodResolver(materialItemSchema),
    defaultValues: {
      name: item.name,
      spec: item.spec || "",
      product_link: item.product_link || "",
      vendor: item.vendor || "",
      quantity: item.quantity || "",
      unit_cost: item.unit_cost || undefined,
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (data: MaterialItemFormData) => {
      const response = await apiRequest(`/api/material-items/${item.id}`, {
        method: "PATCH",
        body: {
          name: data.name,
          spec: data.spec || null,
          product_link: data.product_link || null,
          vendor: data.vendor || null,
          quantity: data.quantity || null,
          unit_cost: data.unit_cost || null,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/material-items?project_id=${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/material-areas?project_id=${projectId}`] });
      toast({
        title: "Item Updated",
        description: "Material item has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmitEdit = (data: MaterialItemFormData) => {
    updateItemMutation.mutate(data);
  };

  const totalCost = (parseFloat(item.quantity || "0") || 1) * (item.unit_cost || 0);

  if (isEditing) {
    return (
      <Card className="border-2 border-primary/50">
        <CardContent className="p-4">
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 2x4 Lumber" {...field} data-testid="input-edit-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <FormControl>
                        <Input placeholder="Home Depot, Lowes..." {...field} data-testid="input-edit-vendor" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="spec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specifications</FormLabel>
                    <FormControl>
                      <Input placeholder="Dimensions, brand, model..." {...field} data-testid="input-edit-spec" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="product_link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} data-testid="input-edit-link" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 50, 100 sq ft" {...field} data-testid="input-edit-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="unit_cost"
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
                          data-testid="input-edit-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    editForm.reset();
                    setIsEditing(false);
                  }}
                  data-testid="button-cancel-edit"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={updateItemMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  <Check className="h-4 w-4 mr-1" />
                  {updateItemMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg" data-testid={`item-row-${item.id}`}>
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium">{item.name}</h4>
            {item.spec && (
              <p className="text-sm text-muted-foreground">{item.spec}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item.product_link && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                data-testid={`button-link-${item.id}`}
              >
                <a href={item.product_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              data-testid={`button-edit-${item.id}`}
            >
              <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item.id)}
              data-testid={`button-delete-${item.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {item.vendor && <span>📦 {item.vendor}</span>}
          {item.quantity && <span>Qty: {item.quantity}</span>}
          {item.unit_cost !== null && item.unit_cost !== undefined && (
            <span>${item.unit_cost.toFixed(2)}/unit</span>
          )}
          {totalCost > 0 && (
            <span className="font-medium text-green-600 dark:text-green-400">
              Total: ${totalCost.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
