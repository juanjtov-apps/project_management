import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import type { Communication, ChangeOrder, Project } from "@shared/schema";
import { 
  MessageSquare, 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  Plus,
  Send,
  Paperclip
} from "lucide-react";

interface CommunicationFeedProps {
  projectId?: string;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case "change_order": return DollarSign;
    case "dispute": return AlertTriangle;
    case "invoice": return DollarSign;
    default: return MessageSquare;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved": return "bg-green-100 text-green-800 border-green-200";
    case "rejected": return "bg-red-100 text-red-800 border-red-200";
    case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "resolved": return "bg-blue-100 text-blue-800 border-blue-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent": return "bg-red-100 text-red-800 border-red-200";
    case "high": return "bg-orange-100 text-orange-800 border-orange-200";
    case "normal": return "bg-blue-100 text-blue-800 border-blue-200";
    case "low": return "bg-green-100 text-green-800 border-green-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function CommunicationFeed({ projectId }: CommunicationFeedProps) {
  const [newMessage, setNewMessage] = useState({
    subject: "",
    message: "",
    type: "message",
    priority: "normal",
    projectId: projectId || ""
  });
  const [newChangeOrder, setNewChangeOrder] = useState({
    title: "",
    description: "",
    costImpact: 0,
    timeImpact: 0,
    projectId: projectId || ""
  });
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showNewChangeOrder, setShowNewChangeOrder] = useState(false);

  const queryClient = useQueryClient();

  // Fetch communications
  const { data: communications = [], isLoading: communicationsLoading } = useQuery<Communication[]>({
    queryKey: projectId ? ["/api/communications", projectId] : ["/api/communications"],
  });

  // Fetch change orders
  const { data: changeOrders = [], isLoading: changeOrdersLoading } = useQuery<ChangeOrder[]>({
    queryKey: projectId ? ["/api/change-orders", projectId] : ["/api/change-orders"],
  });

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Mutations
  const createCommunicationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/communications", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      setNewMessage({ subject: "", message: "", type: "message", priority: "normal", projectId: projectId || "" });
      setShowNewMessage(false);
    },
  });

  const createChangeOrderMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/change-orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      setNewChangeOrder({ title: "", description: "", costImpact: 0, timeImpact: 0, projectId: projectId || "" });
      setShowNewChangeOrder(false);
    },
  });

  const updateChangeOrderMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ChangeOrder> }) =>
      apiRequest("PATCH", `/api/change-orders/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.subject || !newMessage.message || !newMessage.projectId) return;
    createCommunicationMutation.mutate(newMessage);
  };

  const handleCreateChangeOrder = () => {
    if (!newChangeOrder.title || !newChangeOrder.description || !newChangeOrder.projectId) return;
    createChangeOrderMutation.mutate(newChangeOrder);
  };

  const handleChangeOrderAction = (changeOrderId: string, status: string, reason?: string) => {
    updateChangeOrderMutation.mutate({
      id: changeOrderId,
      updates: { status, reason }
    });
  };

  return (
    <div className="space-y-6" data-testid="communication-feed">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-brand-blue">Communications & Change Management</h2>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowNewMessage(true)}
            className="bg-brand-teal hover:bg-brand-teal/90"
            data-testid="new-message-button"
          >
            <Plus size={16} className="mr-2" />
            New Message
          </Button>
          <Button
            onClick={() => setShowNewChangeOrder(true)}
            variant="outline"
            className="border-brand-coral text-brand-coral hover:bg-brand-coral hover:text-white"
            data-testid="new-change-order-button"
          >
            <DollarSign size={16} className="mr-2" />
            Change Order
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Combined feed of all communications and change orders */}
          <div className="space-y-4">
            {communications.filter(c => !projectId || c.projectId === projectId).map((comm) => {
              const TypeIcon = getTypeIcon(comm.type);
              return (
                <Card key={comm.id} className="p-4" data-testid={`communication-${comm.id}`}>
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TypeIcon size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{comm.subject}</h4>
                        <div className="flex space-x-2">
                          <Badge className={getPriorityColor(comm.priority)}>
                            {comm.priority}
                          </Badge>
                          <Badge className={getStatusColor(comm.status)}>
                            {comm.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-2">{comm.message}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>From: {comm.fromEmail || "Internal"}</span>
                        <span>{new Date(comm.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
            
            {changeOrders.filter(co => !projectId || co.projectId === projectId).map((order) => (
              <Card key={order.id} className="p-4 border-l-4 border-l-orange-500" data-testid={`change-order-${order.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign size={20} className="text-orange-600" />
                      <h4 className="font-semibold">{order.title}</h4>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-2">{order.description}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-green-600 font-medium">
                        Cost Impact: ${(order.costImpact / 100).toLocaleString()}
                      </span>
                      <span className="text-blue-600 font-medium">
                        Time Impact: {order.timeImpact} days
                      </span>
                      <span className="text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {order.status === "pending" && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleChangeOrderAction(order.id, "approved")}
                        data-testid={`approve-change-order-${order.id}`}
                      >
                        <CheckCircle size={16} className="mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleChangeOrderAction(order.id, "rejected", "Rejected by project manager")}
                        data-testid={`reject-change-order-${order.id}`}
                      >
                        <XCircle size={16} className="mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="change-orders" className="space-y-4">
          {changeOrders.filter(co => !projectId || co.projectId === projectId).map((order) => (
            <Card key={order.id} className="p-4" data-testid={`change-order-detail-${order.id}`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg">{order.title}</h4>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
                <p className="text-gray-600">{order.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Cost Impact</p>
                    <p className="text-lg font-bold text-green-700">
                      ${(order.costImpact / 100).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Time Impact</p>
                    <p className="text-lg font-bold text-blue-700">
                      {order.timeImpact} days
                    </p>
                  </div>
                </div>
                {order.reason && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 font-medium">Decision Reason</p>
                    <p className="text-gray-700">{order.reason}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Other tab contents would be similar patterns */}
        <TabsContent value="messages">
          <div className="text-center py-8 text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Message filtering coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="disputes">
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Dispute management coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <div className="text-center py-8 text-gray-500">
            <DollarSign size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Invoice management coming soon</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Message Modal */}
      {showNewMessage && (
        <Card className="p-6 border-2 border-brand-teal">
          <h3 className="text-lg font-semibold mb-4">New Communication</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Project</label>
                <Select value={newMessage.projectId} onValueChange={(value) => setNewMessage({...newMessage, projectId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={newMessage.type} onValueChange={(value) => setNewMessage({...newMessage, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="dispute">Dispute</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={newMessage.subject}
                onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
                placeholder="Enter subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={newMessage.message}
                onChange={(e) => setNewMessage({...newMessage, message: e.target.value})}
                placeholder="Enter your message"
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNewMessage(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendMessage}
                disabled={createCommunicationMutation.isPending}
                className="bg-brand-teal hover:bg-brand-teal/90"
              >
                <Send size={16} className="mr-2" />
                Send
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* New Change Order Modal */}
      {showNewChangeOrder && (
        <Card className="p-6 border-2 border-brand-coral">
          <h3 className="text-lg font-semibold mb-4">New Change Order</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Project</label>
              <Select value={newChangeOrder.projectId} onValueChange={(value) => setNewChangeOrder({...newChangeOrder, projectId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newChangeOrder.title}
                onChange={(e) => setNewChangeOrder({...newChangeOrder, title: e.target.value})}
                placeholder="Change order title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newChangeOrder.description}
                onChange={(e) => setNewChangeOrder({...newChangeOrder, description: e.target.value})}
                placeholder="Detailed description of the change"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Cost Impact ($)</label>
                <Input
                  type="number"
                  value={newChangeOrder.costImpact / 100}
                  onChange={(e) => setNewChangeOrder({...newChangeOrder, costImpact: parseFloat(e.target.value) * 100})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Time Impact (days)</label>
                <Input
                  type="number"
                  value={newChangeOrder.timeImpact}
                  onChange={(e) => setNewChangeOrder({...newChangeOrder, timeImpact: parseInt(e.target.value)})}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNewChangeOrder(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateChangeOrder}
                disabled={createChangeOrderMutation.isPending}
                className="bg-brand-coral hover:bg-brand-coral/90"
              >
                Create Change Order
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}