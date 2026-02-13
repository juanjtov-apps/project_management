import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Palette, Type, Image } from "lucide-react";
import { ObjectUploader, type UploadResult } from "@/components/ObjectUploader";

interface BrandingData {
  id: number;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  senderName: string | null;
}

export default function CompanyBrandingForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState("#2563eb");
  const [senderName, setSenderName] = useState("");

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/v1/auth/user"],
  });

  // Load existing branding
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ["/api/v1/companies"],
    enabled: !!currentUser,
  });

  useEffect(() => {
    if (companies.length > 0) {
      const company = companies.find(
        (c: any) =>
          String(c.id) === String(currentUser?.companyId || currentUser?.company_id)
      );
      if (company) {
        if (company.logoUrl) {
          setLogoUrl(company.logoUrl);
          // Generate a signed preview URL from the stored object path
          fetch("/api/v1/objects/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filePath: company.logoUrl }),
            credentials: "include",
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.downloadURL) setLogoPreview(data.downloadURL);
            })
            .catch(() => {});
        }
        if (company.brandColor) {
          setBrandColor(company.brandColor);
        }
        if (company.senderName) {
          setSenderName(company.senderName);
        }
      }
    }
  }, [companies, currentUser]);

  const brandingMutation = useMutation({
    mutationFn: async (data: { logo_url?: string; brand_color?: string; sender_name?: string }) => {
      const response = await apiRequest("/api/v1/onboarding/company-branding", {
        method: "PUT",
        body: data,
      });
      return response.json();
    },
    onSuccess: (data: BrandingData) => {
      toast({ title: "Branding Updated", description: "Your company branding has been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/companies"] });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("/api/v1/objects/upload", { method: "POST" });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      previewURL: data.previewURL,
      objectPath: data.objectPath,
    };
  };

  const handleLogoUploaded = (results: UploadResult[]) => {
    if (results.length > 0) {
      setLogoUrl(results[0].objectPath);
      setLogoPreview(results[0].previewURL);
    }
  };

  const handleSave = () => {
    const updates: Record<string, string> = {};
    if (logoUrl) updates.logo_url = logoUrl;
    if (brandColor) updates.brand_color = brandColor;
    if (senderName) updates.sender_name = senderName;
    brandingMutation.mutate(updates);
  };

  return (
    <Card className="bg-[var(--pro-surface)] border-[var(--pro-border)]">
      <CardHeader>
        <CardTitle className="text-[var(--pro-text-primary)]">Company Branding</CardTitle>
        <CardDescription>
          Customize how your company appears in client invitation emails. Emails are sent on
          behalf of your company — clients never see "Proesphere".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Image className="h-3.5 w-3.5" />
            Company Logo
          </Label>
          <div className="flex items-center gap-4">
            {(logoPreview || logoUrl) && (
              <div className="w-16 h-16 border border-[var(--pro-border)] rounded-lg flex items-center justify-center overflow-hidden bg-white">
                <img
                  src={logoPreview || logoUrl || ""}
                  alt="Company logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <ObjectUploader
              maxNumberOfFiles={1}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleLogoUploaded}
            >
              <Button variant="outline" size="sm">
                {logoUrl ? "Change Logo" : "Upload Logo"}
              </Button>
            </ObjectUploader>
          </div>
          <p className="text-xs text-muted-foreground">
            Recommended: PNG or SVG, max 200px wide.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brandColor" className="flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            Brand Color
          </Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="brandColorPicker"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-[var(--pro-border)]"
            />
            <Input
              id="brandColor"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              placeholder="#2563eb"
              className="w-32"
              maxLength={7}
            />
            <div
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: brandColor }}
            >
              Preview
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Used for buttons and accents in client emails.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="senderName" className="flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5" />
            Email Sender Name
          </Label>
          <Input
            id="senderName"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="e.g., ABC Construction"
          />
          <p className="text-xs text-muted-foreground">
            Emails will be sent as "{senderName || 'Your Company'}" &lt;noreply@mail.proesphere.com&gt;
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={brandingMutation.isPending}
        >
          {brandingMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Branding"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
