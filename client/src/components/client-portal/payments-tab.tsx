import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  DollarSign, Calendar, FileText, Upload, Check, AlertTriangle,
  Plus, Receipt, Download, CreditCard, TrendingUp
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
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

const scheduleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
});

const installmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  currency: z.string().default("USD"),
  due_date: z.string().optional(),
  status: z.string().default("planned"),
  next_milestone: z.boolean().default(false),
  display_order: z.coerce.number().default(0),
});

const documentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  file_id: z.string().min(1, "File is required"),
});

const receiptSchema = z.object({
  receipt_type: z.string().min(1, "Receipt type is required"),
  reference_no: z.string().optional(),
  payment_date: z.string().optional(),
  file_id: z.string().min(1, "File is required"),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;
type InstallmentFormData = z.infer<typeof installmentSchema>;
type DocumentFormData = z.infer<typeof documentSchema>;
type ReceiptFormData = z.infer<typeof receiptSchema>;

interface PaymentsTabProps {
  projectId: string;
}

export default function PaymentsTab({ projectId }: PaymentsTabProps) {
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isInstallmentDialogOpen, setIsInstallmentDialogOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch comprehensive payment data
  const { data: paymentData, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/payments`],
  });

  // Fetch payment totals
  const { data: totals } = useQuery({
    queryKey: [`/api/payment-totals?project_id=${projectId}`],
  });

  const schedules = (paymentData as any)?.schedules || [];
  const installments = (paymentData as any)?.installments || [];
  const documents = (paymentData as any)?.documents || [];
  const invoices = (paymentData as any)?.invoices || [];

  const scheduleForm = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { title: "", notes: "" },
  });

  const installmentForm = useForm<InstallmentFormData>({
    resolver: zodResolver(installmentSchema),
    defaultValues: {
      name: "",
      description: "",
      amount: 0,
      currency: "USD",
      status: "planned",
      next_milestone: false,
      display_order: 0,
    },
  });

  const documentForm = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: { title: "", file_id: "" },
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      const response = await apiRequest("/api/payment-schedules", {
        method: "POST",
        body: { ...data, project_id: projectId },
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/payments`] });
      toast({ title: "Schedule Created", description: "Payment schedule has been created successfully." });
      scheduleForm.reset();
      setIsScheduleDialogOpen(false);
      setSelectedScheduleId(data.id);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create schedule.", variant: "destructive" });
    },
  });

  // Create installment mutation
  const createInstallmentMutation = useMutation({
    mutationFn: async (data: InstallmentFormData) => {
      const response = await apiRequest("/api/payment-installments", {
        method: "POST",
        body: {
          ...data,
          project_id: projectId,
          schedule_id: selectedScheduleId,
          due_date: data.due_date || null,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/payments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/payment-totals?project_id=${projectId}`] });
      toast({ title: "Installment Created", description: "Payment installment has been added." });
      installmentForm.reset();
      setIsInstallmentDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create installment.", variant: "destructive" });
    },
  });

  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (data: DocumentFormData) => {
      const response = await apiRequest("/api/payment-documents", {
        method: "POST",
        body: {
          ...data,
          project_id: projectId,
          schedule_id: selectedScheduleId,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/payments`] });
      toast({ title: "Document Uploaded", description: "Payment document has been uploaded successfully." });
      documentForm.reset();
      setIsDocumentDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload document.", variant: "destructive" });
    },
  });

  const onSubmitSchedule = (data: ScheduleFormData) => {
    createScheduleMutation.mutate(data);
  };

  const onSubmitInstallment = (data: InstallmentFormData) => {
    createInstallmentMutation.mutate(data);
  };

  const onSubmitDocument = (data: DocumentFormData) => {
    createDocumentMutation.mutate(data);
  };

  // Auto-create schedule if none exists (1:1 per project)
  useEffect(() => {
    if (!isLoading && schedules.length === 0 && projectId && !createScheduleMutation.isPending) {
      // Automatically create a schedule for this project
      createScheduleMutation.mutate({
        title: "Payment Schedule",
        notes: "Project payment tracking",
      });
    } else if (schedules.length > 0 && !selectedScheduleId) {
      // Set the schedule ID if one exists
      setSelectedScheduleId(schedules[0].id);
    }
  }, [schedules, isLoading, projectId, selectedScheduleId, createScheduleMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading payment data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Contract</p>
              <p className="text-2xl font-bold">${(totals as any)?.total_amount?.toLocaleString() || "0"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">${(totals as any)?.total_paid?.toLocaleString() || "0"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-orange-600">${(totals as any)?.total_pending?.toLocaleString() || "0"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Progress</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{(totals as any)?.percent_complete || 0}%</p>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Milestone Card */}
      {(totals as any)?.next_milestone && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Calendar className="h-5 w-5" />
              Next Milestone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{(totals as any).next_milestone.name}</h3>
              <p className="text-muted-foreground">{(totals as any).next_milestone.description}</p>
              <div className="flex items-center gap-4 mt-3">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-xl font-bold">${(totals as any).next_milestone.amount?.toLocaleString()}</p>
                </div>
                {(totals as any).next_milestone.due_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="text-xl font-bold">{format(new Date((totals as any).next_milestone.due_date), "MMM dd, yyyy")}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {schedules.length > 0 && (
          <Dialog open={isInstallmentDialogOpen} onOpenChange={setIsInstallmentDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-installment">
                <Plus className="h-4 w-4 mr-2" />
                Add Installment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Payment Installment</DialogTitle>
              </DialogHeader>
              <Form {...installmentForm}>
                <form onSubmit={installmentForm.handleSubmit(onSubmitInstallment)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={installmentForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Installment Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., First Payment" {...field} data-testid="input-installment-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                              data-testid="input-installment-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={installmentForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Payment milestone details..." {...field} data-testid="textarea-installment-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={installmentForm.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-installment-due-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={installmentForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-installment-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="planned">Planned</SelectItem>
                              <SelectItem value="payable">Payable</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={installmentForm.control}
                      name="display_order"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Order</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              data-testid="input-installment-order"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={installmentForm.control}
                    name="next_milestone"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <input 
                            type="checkbox" 
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                            data-testid="checkbox-next-milestone"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Set as Next Milestone</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsInstallmentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createInstallmentMutation.isPending} data-testid="button-submit-installment">
                      {createInstallmentMutation.isPending ? "Adding..." : "Add Installment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-upload-document">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Payment Document</DialogTitle>
            </DialogHeader>
            <Form {...documentForm}>
              <form onSubmit={documentForm.handleSubmit(onSubmitDocument)} className="space-y-4">
                <FormField
                  control={documentForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Project Proposal" {...field} data-testid="input-document-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={documentForm.control}
                  name="file_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Upload file and paste ID..." {...field} data-testid="input-document-file-id" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDocumentDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createDocumentMutation.isPending} data-testid="button-submit-document">
                    {createDocumentMutation.isPending ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Installments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Installments</CardTitle>
        </CardHeader>
        <CardContent>
          {installments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No installments yet. Create a schedule and add installments to track payments.
            </p>
          ) : (
            <div className="space-y-3">
              {installments.map((installment: any) => (
                <InstallmentRow 
                  key={installment.id} 
                  installment={installment} 
                  projectId={projectId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payment Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Uploaded {format(new Date(doc.created_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" data-testid={`button-download-${doc.id}`}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No invoices generated yet.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice: any) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{invoice.invoice_no}</p>
                    <p className="text-sm text-muted-foreground">{invoice.installment_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Issued {format(new Date(invoice.issue_date), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">${parseFloat(invoice.total).toLocaleString()}</p>
                    <Button variant="outline" size="sm" className="mt-2" data-testid={`button-download-invoice-${invoice.id}`}>
                      <Download className="h-4 w-4 mr-1" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface InstallmentRowProps {
  installment: any;
  projectId: string;
}

function InstallmentRow({ installment, projectId }: InstallmentRowProps) {
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const receiptForm = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      receipt_type: "",
      reference_no: "",
      payment_date: "",
      file_id: "",
    },
  });

  // Upload receipt mutation
  const uploadReceiptMutation = useMutation({
    mutationFn: async (data: ReceiptFormData) => {
      const response = await apiRequest("/api/payment-receipts", {
        method: "POST",
        body: {
          ...data,
          project_id: projectId,
          installment_id: installment.id,
          payment_date: data.payment_date || null,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/payments`] });
      toast({ title: "Receipt Uploaded", description: "Payment receipt has been uploaded successfully." });
      receiptForm.reset();
      setIsReceiptDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload receipt.", variant: "destructive" });
    },
  });

  // Mark paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/payment-installments/${installment.id}/mark-paid`, {
        method: "POST",
        body: { tax: 0 },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/payments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/payment-totals?project_id=${projectId}`] });
      toast({ 
        title: "Installment Marked as Paid", 
        description: "Invoice has been generated successfully." 
      });
      setIsMarkPaidDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to mark installment as paid.", 
        variant: "destructive" 
      });
    },
  });

  const onSubmitReceipt = (data: ReceiptFormData) => {
    uploadReceiptMutation.mutate(data);
  };

  const statusColors = {
    planned: "bg-gray-500",
    payable: "bg-orange-500",
    paid: "bg-green-500",
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg" data-testid={`installment-${installment.id}`}>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h4 className="font-semibold">{installment.name}</h4>
          <Badge className={statusColors[installment.status as keyof typeof statusColors]}>
            {installment.status}
          </Badge>
          {installment.next_milestone && (
            <Badge variant="outline" className="border-primary text-primary">
              Next Milestone
            </Badge>
          )}
        </div>
        {installment.description && (
          <p className="text-sm text-muted-foreground mt-1">{installment.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-lg text-foreground">
            ${parseFloat(installment.amount).toLocaleString()}
          </span>
          {installment.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Due {format(new Date(installment.due_date), "MMM dd, yyyy")}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {installment.status !== "paid" && (
          <>
            <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid={`button-upload-receipt-${installment.id}`}>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload Receipt
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Payment Receipt</DialogTitle>
                </DialogHeader>
                <Form {...receiptForm}>
                  <form onSubmit={receiptForm.handleSubmit(onSubmitReceipt)} className="space-y-4">
                    <FormField
                      control={receiptForm.control}
                      name="receipt_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Receipt Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-receipt-type">
                                <SelectValue placeholder="Select type..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="check">Check</SelectItem>
                              <SelectItem value="wire">Wire Transfer</SelectItem>
                              <SelectItem value="ach">ACH</SelectItem>
                              <SelectItem value="credit_card">Credit Card</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={receiptForm.control}
                      name="reference_no"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference Number (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Check #1234" {...field} data-testid="input-receipt-reference" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={receiptForm.control}
                      name="payment_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-receipt-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={receiptForm.control}
                      name="file_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>File ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Upload file and paste ID..." {...field} data-testid="input-receipt-file-id" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsReceiptDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={uploadReceiptMutation.isPending} data-testid="button-submit-receipt">
                        {uploadReceiptMutation.isPending ? "Uploading..." : "Upload Receipt"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <AlertDialog open={isMarkPaidDialogOpen} onOpenChange={setIsMarkPaidDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button size="sm" data-testid={`button-mark-paid-${installment.id}`}>
                  <CreditCard className="h-4 w-4 mr-1" />
                  Mark Paid
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    Mark Installment as Paid
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark "{installment.name}" as paid and generate an invoice. Make sure at least one receipt has been uploaded.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => markPaidMutation.mutate()}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="confirm-mark-paid"
                  >
                    {markPaidMutation.isPending ? "Processing..." : "Mark as Paid"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}
