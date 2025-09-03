import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CreditCard, CheckCircle, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const installmentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
});

const paymentSchema = z.object({
  paymentMethod: z.string().min(1, "Payment method is required"),
});

type InstallmentFormData = z.infer<typeof installmentSchema>;
type PaymentFormData = z.infer<typeof paymentSchema>;

interface Installment {
  id: string;
  projectId: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paymentMethod?: string;
  createdAt: string;
}

interface InstallmentsTabProps {
  projectId: string;
}

export function InstallmentsTab({ projectId }: InstallmentsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<string>("");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const installmentForm = useForm<InstallmentFormData>({
    resolver: zodResolver(installmentSchema),
    defaultValues: {
      amount: 0,
      dueDate: "",
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "",
    },
  });

  // Get installments for the project
  const { data: installments = [], isLoading } = useQuery<Installment[]>({
    queryKey: ["/api/client-installments", projectId],
    enabled: !!projectId,
  });

  // Create installment mutation
  const createInstallmentMutation = useMutation({
    mutationFn: async (data: InstallmentFormData) => {
      return apiRequest(`/projects/${projectId}/installments`, {
        method: "POST",
        body: JSON.stringify({
          projectId,
          amount: data.amount,
          dueDate: new Date(data.dueDate).toISOString(),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-installments", projectId] });
      toast({
        title: "Installment Created",
        description: "Payment installment has been added to the schedule.",
      });
      installmentForm.reset();
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create installment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark installment as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (data: { installmentId: string; paymentMethod: string }) => {
      return apiRequest(`/installments/${data.installmentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentMethod: data.paymentMethod,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-installments", projectId] });
      toast({
        title: "Payment Recorded",
        description: "Installment has been marked as paid.",
      });
      paymentForm.reset();
      setIsPaymentOpen(false);
      setSelectedInstallment("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmitInstallment = (data: InstallmentFormData) => {
    createInstallmentMutation.mutate(data);
  };

  const onSubmitPayment = (data: PaymentFormData) => {
    markPaidMutation.mutate({
      installmentId: selectedInstallment,
      paymentMethod: data.paymentMethod,
    });
  };

  const handleMarkPaid = (installmentId: string) => {
    setSelectedInstallment(installmentId);
    setIsPaymentOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (installment: Installment) => {
    if (installment.isPaid) return "bg-green-100 text-green-800";
    
    const dueDate = new Date(installment.dueDate);
    const today = new Date();
    
    if (dueDate < today) return "bg-red-100 text-red-800";
    if (dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) return "bg-yellow-100 text-yellow-800";
    return "bg-blue-100 text-blue-800";
  };

  const getStatusText = (installment: Installment) => {
    if (installment.isPaid) return "Paid";
    
    const dueDate = new Date(installment.dueDate);
    const today = new Date();
    
    if (dueDate < today) return "Overdue";
    if (dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) return "Due Soon";
    return "Pending";
  };

  const totalAmount = installments.reduce((sum, inst) => sum + inst.amount, 0);
  const paidAmount = installments.filter(inst => inst.isPaid).reduce((sum, inst) => sum + inst.amount, 0);
  const pendingAmount = totalAmount - paidAmount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Schedule</h2>
          <p className="text-muted-foreground">
            Track project installments and payment status
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-installment">
              <Plus className="h-4 w-4 mr-2" />
              Add Installment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Payment Installment</DialogTitle>
            </DialogHeader>
            
            <Form {...installmentForm}>
              <form onSubmit={installmentForm.handleSubmit(onSubmitInstallment)} className="space-y-6">
                <FormField
                  control={installmentForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-installment-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={installmentForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field}
                          data-testid="input-installment-date"
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
                    data-testid="button-cancel-installment"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createInstallmentMutation.isPending}
                    data-testid="button-submit-installment"
                  >
                    {createInstallmentMutation.isPending ? "Creating..." : "Create Installment"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            
            <Form {...paymentForm}>
              <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)} className="space-y-6">
                <FormField
                  control={paymentForm.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="credit-card">Credit Card</SelectItem>
                          <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPaymentOpen(false)}
                    data-testid="button-cancel-payment"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={markPaidMutation.isPending}
                    data-testid="button-submit-payment"
                  >
                    {markPaidMutation.isPending ? "Recording..." : "Mark as Paid"}
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
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Installments List */}
      {isLoading ? (
        <div className="text-center py-8">Loading installments...</div>
      ) : installments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Payment Schedule</h3>
              <p className="text-muted-foreground mb-4">
                Create installments to track payment schedules for this project.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Installment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {installments.map((installment) => (
            <Card key={installment.id} data-testid={`card-installment-${installment.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <CardTitle className="text-xl">{formatCurrency(installment.amount)}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Due: {formatDate(installment.dueDate)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(installment)}>
                      {getStatusText(installment)}
                    </Badge>
                    
                    {!installment.isPaid && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkPaid(installment.id)}
                        data-testid={`button-mark-paid-${installment.id}`}
                      >
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {installment.isPaid && installment.paymentMethod && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Paid via: <span className="capitalize">{installment.paymentMethod.replace('-', ' ')}</span>
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}