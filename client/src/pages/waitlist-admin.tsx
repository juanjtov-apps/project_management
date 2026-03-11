import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Mail, Building, Briefcase, Phone, MessageSquare, Calendar } from 'lucide-react';

interface WaitlistEntry {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  role: string | null;
  phone: string | null;
  message: string | null;
  createdAt: string;
}

interface WaitlistResponse {
  entries: WaitlistEntry[];
  total: number;
  skip: number;
  limit: number;
}

export default function WaitlistAdmin() {
  const { t } = useTranslation('admin');

  // Get current user for access control
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/v1/auth/user'],
    retry: false
  });

  // Check if user is root admin
  const isRootAdmin = currentUser?.isRoot === true || currentUser?.is_root === true;

  // Fetch waitlist data (only if root admin)
  const { data: waitlistData, isLoading, error } = useQuery<WaitlistResponse>({
    queryKey: ['/api/v1/admin/waitlist'],
    enabled: isRootAdmin,
    retry: 1,
    staleTime: 30000,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Access denied for non-root users
  if (!isRootAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{t('waitlist.accessDenied')}</CardTitle>
            <CardDescription>
              {t('waitlist.accessDeniedDesc')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{t('waitlist.errorLoading')}</CardTitle>
            <CardDescription>
              {t('waitlist.errorLoadingDesc')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const entries = waitlistData?.entries || [];
  const total = waitlistData?.total || 0;

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('waitlist.title')}</h1>
          <p className="text-muted-foreground">
            {t('waitlist.subtitle')}
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Users className="w-4 h-4 mr-2" />
          {total} {t('waitlist.total')}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('waitlist.totalSignups')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('waitlist.withCompany')}</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {entries.filter(e => e.company).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('waitlist.withPhone')}</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {entries.filter(e => e.phone).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('waitlist.withMessage')}</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {entries.filter(e => e.message).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('waitlist.allSignups')}</CardTitle>
          <CardDescription>
            {t('waitlist.allSignupsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('waitlist.noSignups')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('waitlist.name')}</TableHead>
                  <TableHead>{t('waitlist.email')}</TableHead>
                  <TableHead>{t('waitlist.company')}</TableHead>
                  <TableHead>{t('waitlist.role')}</TableHead>
                  <TableHead>{t('waitlist.phone')}</TableHead>
                  <TableHead>{t('waitlist.message')}</TableHead>
                  <TableHead>{t('waitlist.signedUp')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.firstName} {entry.lastName}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${entry.email}`}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        {entry.email}
                      </a>
                    </TableCell>
                    <TableCell>
                      {entry.company ? (
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-muted-foreground" />
                          {entry.company}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.role ? (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3 text-muted-foreground" />
                          {entry.role}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.phone ? (
                        <a
                          href={`tel:${entry.phone}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          {entry.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {entry.message ? (
                        <span className="truncate block" title={entry.message}>
                          {entry.message}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(entry.createdAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
