import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Loader2, Mail, Phone } from "lucide-react";

const inviteSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[\d\s()-]{7,20}$/.test(val),
      "Please enter a valid phone number"
    ),
  project_id: z.string().min(1, "Please select a project"),
  welcome_note: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteClientDialogProps {
  trigger?: React.ReactNode;
  defaultProjectId?: string;
}

export default function InviteClientDialog({
  trigger,
  defaultProjectId,
}: InviteClientDialogProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/projects"],
  });

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      project_id: defaultProjectId || "",
      welcome_note: "",
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const response = await apiRequest("/api/v1/onboarding/invite-client", {
        method: "POST",
        body: {
          ...data,
          phone: data.phone || undefined,
          welcome_note: data.welcome_note || undefined,
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      const channels: string[] = [];
      if (data.emailSent) channels.push("email");
      if (data.smsSent) channels.push("SMS");
      const channelText =
        channels.length > 0
          ? ` Invitation sent via ${channels.join(" and ")}.`
          : " Invitation created (email/SMS delivery may be pending).";

      toast({
        title: t('inviteClient.invited'),
        description: t('inviteClient.invitedDesc', { name: form.getValues("first_name"), project: data.projectName, channels: channelText }),
      });
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rbac/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: t('inviteClient.failed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InviteFormData) => {
    inviteMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            {t('inviteClient.trigger')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('inviteClient.dialogTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">{t('inviteClient.firstName')}</Label>
              <Input
                id="first_name"
                placeholder="John"
                {...form.register("first_name")}
                className={form.formState.errors.first_name ? "border-red-500" : ""}
              />
              {form.formState.errors.first_name && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.first_name.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">{t('inviteClient.lastName')}</Label>
              <Input
                id="last_name"
                placeholder="Doe"
                {...form.register("last_name")}
                className={form.formState.errors.last_name ? "border-red-500" : ""}
              />
              {form.formState.errors.last_name && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {t('inviteClient.email')}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="client@example.com"
              {...form.register("email")}
              className={form.formState.errors.email ? "border-red-500" : ""}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-500">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {t('inviteClient.phone')}
            </Label>
            <Input
              id="phone"
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
            <p className="text-xs text-muted-foreground">
              {t('inviteClient.phoneHint')}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project_id">{t('inviteClient.project')}</Label>
            <Select
              value={form.watch("project_id")}
              onValueChange={(val) => form.setValue("project_id", val)}
            >
              <SelectTrigger
                className={form.formState.errors.project_id ? "border-red-500" : ""}
              >
                <SelectValue placeholder={t('inviteClient.selectProject')} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.project_id && (
              <p className="text-xs text-red-500">
                {form.formState.errors.project_id.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="welcome_note">{t('inviteClient.welcomeNote')}</Label>
            <Textarea
              id="welcome_note"
              placeholder={t('inviteClient.welcomeNotePlaceholder')}
              rows={3}
              {...form.register("welcome_note")}
            />
            <p className="text-xs text-muted-foreground">
              {t('inviteClient.welcomeNoteHint')}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t('inviteClient.cancel')}
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('inviteClient.sending')}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('inviteClient.trigger')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
