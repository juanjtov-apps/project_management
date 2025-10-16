import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  DollarSign, Calendar, FileText, Upload, Check, AlertTriangle,
  Plus, Receipt, Download, CreditCard, TrendingUp, Trash2
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
  file_id: z.string().optional(),
});

const receiptSchema = z.object({
  receipt_type: z.string().min(1, "Receipt type is required"),
  reference_no: z.string().optional(),
  payment_date: z.string().optional(),
  file_id: z.string().optional(),
});

const invoiceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  file_id: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;
type InstallmentFormData = z.infer<typeof installmentSchema>;
type DocumentFormData = z.infer<typeof documentSchema>;
type ReceiptFormData = z.infer<typeof receiptSchema>;
type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface Receipt {
  id: string;
  project_id: string;
  installment_id: string;
  receipt_type: string;
  reference_no?: string;
  payment_date?: string;
  file_id?: string;
  uploaded_by: string;
  created_at: string;
}

interface PaymentsTabProps {
  projectId: string;
}

export default function PaymentsTab({ projectId }: PaymentsTabProps) {
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isInstallmentDialogOpen, setIsInstallmentDialogOpen] = useState(false);
  const [isEditInstallmentDialogOpen, setIsEditInstallmentDialogOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedInvoiceFile, setSelectedInvoiceFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const hasInitializedSchedule = useRef(false);
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
  const receipts = (paymentData as any)?.receipts || [];
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

  const editInstallmentForm = useForm<InstallmentFormData>({
    resolver: zodResolver(installmentSchema),
    defaultValues: {
      name: "",
      description: "",
      amount: 0,
      currency: "USD",
      due_date: "",
      status: "planned",
      next_milestone: false,
      display_order: 0,
    },
  });

  const invoiceForm = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
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

  // Create invoice document mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const response = await apiRequest("/api/payment-documents", {
        method: "POST",
        body: {
          ...data,
          document_type: "invoice",
          project_id: projectId,
          schedule_id: selectedScheduleId,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/payments`] });
      toast({ title: "Invoice Uploaded", description: "Invoice document has been uploaded successfully." });
      invoiceForm.reset();
      setIsInvoiceDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload invoice.", variant: "destructive" });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest(`/api/payment-documents/${documentId}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/payments`] });
      toast({ title: "Document Deleted", description: "Payment document has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete document.", variant: "destructive" });
    },
  });

  const onSubmitSchedule = (data: ScheduleFormData) => {
    createScheduleMutation.mutate(data);
  };

  const onSubmitInstallment = (data: InstallmentFormData) => {
    createInstallmentMutation.mutate(data);
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const response = await fetch('/api/objects/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });
      
      const { downloadURL } = await response.json();
      
      // Open the signed URL in a new tab to trigger download
      window.open(downloadURL, '_blank');
      
      toast({ title: "Download Started", description: `Downloading ${fileName}` });
    } catch (error) {
      toast({ title: "Download Error", description: "Failed to download file.", variant: "destructive" });
    }
  };

  const onSubmitDocument = async (data: DocumentFormData) => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }

    try {
      setIsUploading(true);
      
      // Get upload URL from backend
      const uploadResponse = await fetch('/api/objects/upload', { method: 'POST' });
      const { uploadURL } = await uploadResponse.json();
      
      // Upload file to object storage
      const uploadResult = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type },
        body: selectedFile,
      });

      if (!uploadResult.ok) {
        throw new Error('File upload failed');
      }

      // Extract file path from upload URL
      const url = new URL(uploadURL);
      const filePath = url.pathname.split('/').slice(2).join('/');
      
      // Submit document with file path
      createDocumentMutation.mutate({
        ...data,
        file_id: filePath,
      });
      
      setSelectedFile(null);
    } catch (error) {
      toast({ title: "Upload Error", description: "Failed to upload file.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmitInvoice = async (data: InvoiceFormData) => {
    if (!selectedInvoiceFile) {
      toast({ title: "Error", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }

    try {
      setIsUploadingInvoice(true);
      
      // Get upload URL from backend
      const uploadResponse = await fetch('/api/objects/upload', { method: 'POST' });
      const { uploadURL } = await uploadResponse.json();
      
      // Upload file to object storage
      const uploadResult = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': selectedInvoiceFile.type },
        body: selectedInvoiceFile,
      });

      if (!uploadResult.ok) {
        throw new Error('File upload failed');
      }

      // Extract file path from upload URL
      const url = new URL(uploadURL);
      const filePath = url.pathname.split('/').slice(2).join('/');
      
      // Submit invoice with file path
      createInvoiceMutation.mutate({
        ...data,
        file_id: filePath,
      });
      
      setSelectedInvoiceFile(null);
    } catch (error) {
      toast({ title: "Upload Error", description: "Failed to upload file.", variant: "destructive" });
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  // Auto-create schedule if none exists (1:1 per project)
  useEffect(() => {
    if (!isLoading && schedules.length === 0 && projectId && !hasInitializedSchedule.current && !createScheduleMutation.isPending) {
      // Mark as initialized to prevent duplicate creation
      hasInitializedSchedule.current = true;
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

  // Reset initialization flag when project changes
  useEffect(() => {
    hasInitializedSchedule.current = false;
    setSelectedScheduleId(null);
  }, [projectId]);

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
                    <Button type="button" variant="outline" onClick={() => setIsInstallmentDialogOpen(false)} data-testid="button-cancel-add-installment">
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

        <Dialog open={isDocumentDialogOpen} onOpenChange={(open) => {
          setIsDocumentDialogOpen(open);
          if (!open) {
            setSelectedFile(null);
            documentForm.reset();
          }
        }}>
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
                <div>
                  <FormLabel>Select File</FormLabel>
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                        }
                      }}
                      data-testid="input-document-file"
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDocumentDialogOpen(false);
                    setSelectedFile(null);
                  }} data-testid="button-cancel-upload-document">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUploading || createDocumentMutation.isPending} data-testid="button-submit-document">
                    {isUploading ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isInvoiceDialogOpen} onOpenChange={(open) => {
          setIsInvoiceDialogOpen(open);
          if (!open) {
            setSelectedInvoiceFile(null);
            invoiceForm.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-upload-invoice">
              <Upload className="h-4 w-4 mr-2" />
              Upload Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Invoice Document</DialogTitle>
            </DialogHeader>
            <Form {...invoiceForm}>
              <form onSubmit={invoiceForm.handleSubmit(onSubmitInvoice)} className="space-y-4">
                <FormField
                  control={invoiceForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Final Invoice" {...field} data-testid="input-invoice-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel>Select Invoice File</FormLabel>
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedInvoiceFile(file);
                        }
                      }}
                      data-testid="input-invoice-file"
                    />
                    {selectedInvoiceFile && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selected: {selectedInvoiceFile.name} ({(selectedInvoiceFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsInvoiceDialogOpen(false);
                    setSelectedInvoiceFile(null);
                  }} data-testid="button-cancel-upload-invoice">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUploadingInvoice || createInvoiceMutation.isPending} data-testid="button-submit-invoice">
                    {isUploadingInvoice ? "Uploading..." : "Upload Invoice"}
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
              No installments yet. Add installments to track payments.
            </p>
          ) : (
            <div className="space-y-3">
              {installments.map((installment: any) => (
                <InstallmentRow 
                  key={installment.id} 
                  installment={installment} 
                  projectId={projectId}
                  receipts={receipts.filter((r: any) => r.installment_id === installment.id)}
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
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDownload(doc.file_id, doc.title)}
                      data-testid={`button-download-${doc.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this document?")) {
                          deleteDocumentMutation.mutate(doc.id);
                        }
                      }}
                      disabled={deleteDocumentMutation.isPending}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-${doc.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2" 
                      onClick={() => {
                        toast({ 
                          title: "PDF Not Available", 
                          description: "PDF generation for invoices will be available soon.",
                          variant: "default"
                        });
                      }}
                      data-testid={`button-download-invoice-${invoice.id}`}
                    >
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
  receipts: Receipt[];
}

function InstallmentRow({ installment, projectId, receipts }: InstallmentRowProps) {
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReceiptWarningOpen, setIsReceiptWarningOpen] = useState(false);
  const [selectedReceiptFile, setSelectedReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
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

  const editForm = useForm<InstallmentFormData>({
    resolver: zodResolver(installmentSchema),
    defaultValues: {
      name: installment.name || "",
      description: installment.description || "",
      amount: installment.amount || 0,
      currency: installment.currency || "USD",
      due_date: installment.due_date ? format(new Date(installment.due_date), "yyyy-MM-dd") : "",
      status: installment.status || "planned",
      next_milestone: installment.next_milestone || false,
      display_order: installment.display_order || 0,
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

  // Edit installment mutation
  const editInstallmentMutation = useMutation({
    mutationFn: async (data: InstallmentFormData) => {
      const response = await apiRequest(`/api/payment-installments/${installment.id}`, {
        method: "PATCH",
        body: data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/payments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/payment-totals?project_id=${projectId}`] });
      toast({ title: "Installment Updated", description: "Payment installment has been updated successfully." });
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update installment.", variant: "destructive" });
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

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const response = await fetch('/api/objects/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });
      
      const { downloadURL } = await response.json();
      
      // Open the signed URL in a new tab to trigger download
      window.open(downloadURL, '_blank');
      
      toast({ title: "Download Started", description: `Downloading ${fileName}` });
    } catch (error) {
      toast({ title: "Download Error", description: "Failed to download file.", variant: "destructive" });
    }
  };

  const onSubmitReceipt = async (data: ReceiptFormData) => {
    if (!selectedReceiptFile) {
      toast({ title: "Error", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }

    try {
      setIsUploadingReceipt(true);
      
      // Get upload URL from backend
      const uploadResponse = await fetch('/api/objects/upload', { method: 'POST' });
      const { uploadURL } = await uploadResponse.json();
      
      // Upload file to object storage
      const uploadResult = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': selectedReceiptFile.type },
        body: selectedReceiptFile,
      });

      if (!uploadResult.ok) {
        throw new Error('File upload failed');
      }

      // Extract file path from upload URL
      const url = new URL(uploadURL);
      const filePath = url.pathname.split('/').slice(2).join('/');
      
      // Submit receipt with file path
      uploadReceiptMutation.mutate({
        ...data,
        file_id: filePath,
      });
      
      setSelectedReceiptFile(null);
    } catch (error) {
      toast({ title: "Upload Error", description: "Failed to upload file.", variant: "destructive" });
    } finally {
      setIsUploadingReceipt(false);
    }
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
        
        {receipts.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2" data-testid="text-receipts-count">
              Payment Receipts ({receipts.length})
            </p>
            <div className="space-y-1">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs" data-testid={`text-receipt-type-${receipt.id}`}>
                      {receipt.receipt_type} 
                      {receipt.reference_no && ` - ${receipt.reference_no}`}
                    </span>
                    {receipt.payment_date && (
                      <span className="text-xs text-muted-foreground" data-testid={`text-receipt-date-${receipt.id}`}>
                        ({format(new Date(receipt.payment_date), "MMM dd, yyyy")})
                      </span>
                    )}
                  </div>
                  {receipt.file_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(receipt.file_id!, `receipt-${receipt.reference_no || receipt.id}`)}
                      className="h-6 px-2"
                      data-testid={`button-download-receipt-${receipt.id}`}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {installment.status !== "paid" && (
          <>
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
              setIsEditDialogOpen(open);
              if (!open) {
                editForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid={`button-edit-installment-${installment.id}`}>
                  <FileText className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Payment Installment</DialogTitle>
                </DialogHeader>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit((data) => editInstallmentMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-installment-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-edit-installment-amount" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={editForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-edit-installment-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="due_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-edit-installment-due-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-installment-status">
                                  <SelectValue placeholder="Select status" />
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
                    </div>
                    <FormField
                      control={editForm.control}
                      name="next_milestone"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              data-testid="checkbox-edit-installment-next-milestone"
                              className="h-4 w-4"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Mark as Next Milestone</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit-installment">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={editInstallmentMutation.isPending} data-testid="button-submit-edit-installment">
                        {editInstallmentMutation.isPending ? "Updating..." : "Update Installment"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={isReceiptDialogOpen} onOpenChange={(open) => {
              setIsReceiptDialogOpen(open);
              if (!open) {
                setSelectedReceiptFile(null);
                receiptForm.reset();
              }
            }}>
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
                    <div>
                      <FormLabel>Select Receipt File</FormLabel>
                      <div className="mt-2">
                        <Input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedReceiptFile(file);
                            }
                          }}
                          data-testid="input-receipt-file"
                        />
                        {selectedReceiptFile && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Selected: {selectedReceiptFile.name} ({(selectedReceiptFile.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => {
                        setIsReceiptDialogOpen(false);
                        setSelectedReceiptFile(null);
                      }} data-testid="button-cancel-upload-receipt">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isUploadingReceipt || uploadReceiptMutation.isPending} data-testid="button-submit-receipt">
                        {isUploadingReceipt ? "Uploading..." : "Upload Receipt"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Button 
              size="sm" 
              data-testid={`button-mark-paid-${installment.id}`}
              onClick={() => {
                if (receipts.length === 0) {
                  setIsReceiptWarningOpen(true);
                } else {
                  setIsMarkPaidDialogOpen(true);
                }
              }}
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Mark Paid
            </Button>

            <AlertDialog open={isMarkPaidDialogOpen} onOpenChange={setIsMarkPaidDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    Mark Installment as Paid
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark "{installment.name}" as paid and generate an invoice.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-mark-paid">Cancel</AlertDialogCancel>
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

            <Dialog open={isReceiptWarningOpen} onOpenChange={setIsReceiptWarningOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    Receipt Required
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    At least one receipt must be uploaded before marking this installment as paid. 
                    This helps maintain accurate payment records.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsReceiptWarningOpen(false)}
                      data-testid="button-close-receipt-warning"
                    >
                      Close
                    </Button>
                    <Button 
                      onClick={() => {
                        setIsReceiptWarningOpen(false);
                        setIsReceiptDialogOpen(true);
                      }}
                      data-testid="button-upload-receipt-from-warning"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Receipt
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
