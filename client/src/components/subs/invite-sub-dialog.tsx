import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Loader2,
  Mail,
  Phone,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const inviteSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[\d\s()-]{7,20}$/.test(val),
      "Please enter a valid phone number"
    ),
  companyName: z.string().optional(),
  existingCompanyId: z.string().optional(),
  trade: z.string().optional(),
  projectId: z.string().min(1, "Please select a project"),
  specialization: z.string().optional(),
  contractValue: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  welcomeNote: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface SubCompany {
  id: string;
  companyName: string;
  trade?: string;
}

interface Project {
  id: number | string;
  name: string;
}

interface InviteSubDialogProps {
  trigger?: React.ReactNode;
  defaultProjectId?: string;
}

export function InviteSubDialog({
  trigger,
  defaultProjectId,
}: InviteSubDialogProps) {
  const [open, setOpen] = useState(false);
  const [companyMode, setCompanyMode] = useState<"existing" | "new">("new");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      companyName: "",
      existingCompanyId: "",
      trade: "",
      projectId: defaultProjectId || "",
      specialization: "",
      contractValue: undefined,
      welcomeNote: "",
    },
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/v1/projects"],
    queryFn: async () => {
      const res = await fetch("/api/v1/projects", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  // Fetch existing sub companies
  const { data: subCompanies = [] } = useQuery<SubCompany[]>({
    queryKey: ["/api/v1/sub/companies"],
    queryFn: async () => {
      const res = await fetch("/api/v1/sub/companies", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const body: Record<string, unknown> = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        projectId: data.projectId,
        trade: data.trade || undefined,
        specialization: data.specialization || undefined,
        contractValue: data.contractValue || undefined,
        welcomeNote: data.welcomeNote || undefined,
      };

      if (companyMode === "existing" && data.existingCompanyId) {
        body.existingCompanyId = data.existingCompanyId;
      } else if (data.companyName) {
        body.companyName = data.companyName;
      }

      const res = await fetch("/api/v1/sub/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sub/companies"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/rbac/users"],
      });
      toast({
        title: "Invitation Sent",
        description: `${form.getValues("firstName")} ${form.getValues("lastName")} has been invited as a subcontractor.`,
      });
      setOpen(false);
      form.reset();
      setCompanyMode("new");
    },
    onError: (error: Error) => {
      toast({
        title: "Invitation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: InviteFormData) {
    inviteMutation.mutate(data);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          form.reset();
          setCompanyMode("new");
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Sub
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Invite Subcontractor</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-first">First Name *</Label>
              <Input
                id="inv-first"
                placeholder="John"
                {...form.register("firstName")}
                className={
                  form.formState.errors.firstName ? "border-red-500" : ""
                }
              />
              {form.formState.errors.firstName && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-last">Last Name *</Label>
              <Input
                id="inv-last"
                placeholder="Smith"
                {...form.register("lastName")}
                className={
                  form.formState.errors.lastName ? "border-red-500" : ""
                }
              />
              {form.formState.errors.lastName && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email *
            </Label>
            <Input
              id="inv-email"
              type="email"
              placeholder="sub@company.com"
              {...form.register("email")}
              className={form.formState.errors.email ? "border-red-500" : ""}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-500">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Phone (optional)
            </Label>
            <Input
              id="inv-phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              {...form.register("phone")}
              className={form.formState.errors.phone ? "border-red-500" : ""}
            />
            {form.formState.errors.phone && (
              <p className="text-xs text-red-500">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          {/* Company: Existing or New */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5" />
              Company
            </Label>

            {subCompanies.length > 0 && (
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant={companyMode === "existing" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCompanyMode("existing")}
                  className="flex-1"
                >
                  Existing Company
                </Button>
                <Button
                  type="button"
                  variant={companyMode === "new" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCompanyMode("new")}
                  className="flex-1"
                >
                  New Company
                </Button>
              </div>
            )}

            {companyMode === "existing" && subCompanies.length > 0 ? (
              <Controller
                name="existingCompanyId"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select existing company" />
                    </SelectTrigger>
                    <SelectContent>
                      {subCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.companyName}
                          {company.trade && ` (${company.trade})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            ) : (
              <Input
                placeholder="Company name"
                {...form.register("companyName")}
              />
            )}
          </div>

          {/* Trade & Specialization */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-trade">Trade</Label>
              <Input
                id="inv-trade"
                placeholder="e.g. Electrical"
                {...form.register("trade")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-spec">Specialization</Label>
              <Input
                id="inv-spec"
                placeholder="e.g. Commercial wiring"
                {...form.register("specialization")}
              />
            </div>
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <Label>Project *</Label>
            <Controller
              name="projectId"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    className={
                      form.formState.errors.projectId ? "border-red-500" : ""
                    }
                  >
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem
                        key={project.id}
                        value={String(project.id)}
                      >
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.projectId && (
              <p className="text-xs text-red-500">
                {form.formState.errors.projectId.message}
              </p>
            )}
          </div>

          {/* Contract Value */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-contract">Contract Value ($)</Label>
            <Input
              id="inv-contract"
              type="number"
              min="0"
              step="0.01"
              placeholder="50000"
              {...form.register("contractValue")}
            />
          </div>

          {/* Welcome Note */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-note">Welcome Note (optional)</Label>
            <Textarea
              id="inv-note"
              placeholder="Welcome to the project! Please review the assigned tasks..."
              rows={3}
              {...form.register("welcomeNote")}
            />
            <p className="text-xs text-[var(--pro-text-muted)]">
              This note will appear in the invitation email.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Sub
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
