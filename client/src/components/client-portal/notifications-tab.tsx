import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Bell, Mail, Settings, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const notificationSchema = z.object({
  materialId: z.string().optional(),
  groupName: z.string().optional(),
  frequencyValue: z.number().min(1, "Frequency must be at least 1"),
  frequencyUnit: z.enum(["day", "week", "month"]),
  notifyViaEmail: z.boolean(),
}).refine((data) => data.materialId || data.groupName, {
  message: "Either select a material or enter a group name",
  path: ["materialId"],
});

type NotificationFormData = z.infer<typeof notificationSchema>;

interface NotificationSetting {
  id: string;
  projectId: string;
  materialId?: string;
  groupName?: string;
  frequencyValue: number;
  frequencyUnit: "day" | "week" | "month";
  notifyViaEmail: boolean;
  createdAt: string;
}

interface Material {
  id: string;
  name: string;
}

interface NotificationsTabProps {
  projectId: string;
}

export function NotificationsTab({ projectId }: NotificationsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      materialId: "",
      groupName: "",
      frequencyValue: 1,
      frequencyUnit: "week",
      notifyViaEmail: true,
    },
  });

  // Get notification settings for the project
  const { data: notifications = [], isLoading } = useQuery<NotificationSetting[]>({
    queryKey: [`/api/client-notifications?project_id=${projectId}`],
    enabled: !!projectId,
  });

  // Get materials for the project
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: [`/api/client-materials?project_id=${projectId}`],
    enabled: !!projectId,
  });

  // Create notification setting mutation
  const createNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      const response = await apiRequest(`/api/client-notifications`, {
        method: "POST",
        body: {
          project_id: projectId,
          material_id: data.materialId || null,
          group_name: data.groupName || null,
          frequency_value: data.frequencyValue,
          frequency_unit: data.frequencyUnit,
          notify_via_email: data.notifyViaEmail,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-notifications?project_id=${projectId}`] });
      toast({
        title: "Notification Setting Created",
        description: "Your notification preference has been saved.",
      });
      form.reset();
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create notification setting. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Remove notification setting mutation
  const removeNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest(`/api/client-notifications/${notificationId}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-notifications?project_id=${projectId}`] });
      toast({
        title: "Notification Setting Removed",
        description: "Notification preference has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to remove notification setting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NotificationFormData) => {
    createNotificationMutation.mutate(data);
  };

  const handleRemoveNotification = (notificationId: string) => {
    if (confirm("Are you sure you want to remove this notification setting?")) {
      removeNotificationMutation.mutate(notificationId);
    }
  };

  const getFrequencyText = (value: number, unit: string) => {
    const pluralUnit = value === 1 ? unit : `${unit}s`;
    return `Every ${value} ${pluralUnit}`;
  };

  const getMaterialName = (materialId?: string) => {
    if (!materialId) return null;
    const material = materials.find(m => m.id === materialId);
    return material?.name || "Unknown Material";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Settings</h2>
          <p className="text-muted-foreground">
            Configure how and when you receive project updates
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-notification">
              <Plus className="h-4 w-4 mr-2" />
              Add Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Notification Setting</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="materialId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specific Material (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-material">
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No specific material</SelectItem>
                            {materials.map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                {material.name}
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
                    name="groupName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Electrical, Plumbing"
                            {...field}
                            data-testid="input-group-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="frequencyValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency Value</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            data-testid="input-frequency-value"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="frequencyUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-frequency-unit">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="day">Day(s)</SelectItem>
                            <SelectItem value="week">Week(s)</SelectItem>
                            <SelectItem value="month">Month(s)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notifyViaEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Email Notifications
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-email-notifications"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    data-testid="button-cancel-notification"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createNotificationMutation.isPending}
                    data-testid="button-submit-notification"
                  >
                    {createNotificationMutation.isPending ? "Creating..." : "Create Setting"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notification Settings List */}
      {isLoading ? (
        <div className="text-center py-8">Loading notification settings...</div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Notification Settings</h3>
              <p className="text-muted-foreground mb-4">
                Configure when and how you want to receive project updates.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Notification Setting
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notifications.map((notification) => (
            <Card key={notification.id} data-testid={`card-notification-${notification.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      {notification.materialId 
                        ? getMaterialName(notification.materialId)
                        : notification.groupName || "General Notifications"
                      }
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="outline">
                        {getFrequencyText(notification.frequencyValue, notification.frequencyUnit)}
                      </Badge>
                      {notification.notifyViaEmail && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveNotification(notification.id)}
                    disabled={removeNotificationMutation.isPending}
                    data-testid={`button-remove-notification-${notification.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Created {new Date(notification.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}