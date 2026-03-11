import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings, useUpdateSetting, useUserRoles } from "@/hooks/useSettings";
import { useAuth } from "@/auth/useAuth";
import { getCanonicalRole, canEditSettings } from "@/auth/roles";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";

const SettingsPage = () => {
  const { user } = useAuth();
  const role = getCanonicalRole(user?.user_metadata?.role as string | undefined);
  const canEdit = canEditSettings(role);

  const { data: settings = [], isLoading: settingsLoading, error: settingsError } = useSettings();
  const updateSetting = useUpdateSetting();

  const general = settings.find((s) => s.key === "system.general")?.value ?? {
    name: "BLUEPEAK HR Portal",
    timezone: "UTC+8",
    workHoursPerDay: 8,
  };
  const company = settings.find((s) => s.key === "company.info")?.value ?? {
    name: "BLUEPEAK",
    registrationNumber: "REG-2020-001234",
  };

  const [systemName, setSystemName] = useState(general.name);
  const [timezone, setTimezone] = useState(general.timezone);
  const [workHours, setWorkHours] = useState<number | string>(general.workHoursPerDay);

  const [companyName, setCompanyName] = useState(company.name);
  const [registrationNumber, setRegistrationNumber] = useState(company.registrationNumber);

  useEffect(() => {
    setSystemName(general.name);
    setTimezone(general.timezone);
    setWorkHours(general.workHoursPerDay);
  }, [general.name, general.timezone, general.workHoursPerDay]);

  useEffect(() => {
    setCompanyName(company.name);
    setRegistrationNumber(company.registrationNumber);
  }, [company.name, company.registrationNumber]);

  const { data: roles = [], isLoading: rolesLoading, error: rolesError } = useUserRoles();

  async function saveGeneral() {
    if (!canEdit) return;
    try {
      await updateSetting.mutateAsync({
        key: "system.general",
        value: {
          name: systemName,
          timezone,
          workHoursPerDay: Number(workHours) || 8,
        },
      });
      toast({
        title: "General settings saved",
        description: "System configuration updated.",
      });
    } catch (err) {
      toast({
        title: "Failed to save settings",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  }

  async function saveCompany() {
    if (!canEdit) return;
    try {
      await updateSetting.mutateAsync({
        key: "company.info",
        value: {
          name: companyName,
          registrationNumber,
        },
      });
      toast({
        title: "Company info saved",
        description: "Company details updated.",
      });
    } catch (err) {
      toast({
        title: "Failed to save company info",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="System configuration and preferences" />

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle className="text-base">General Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-md">
              {settingsLoading && (
                <p className="text-sm text-muted-foreground">Loading settings...</p>
              )}
              {settingsError && (
                <p className="text-sm text-destructive">Failed to load settings.</p>
              )}

              <div className="space-y-2">
                <Label>System Name</Label>
                <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>Default Timezone</Label>
                <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>Work Hours Per Day</Label>
                <Input
                  type="number"
                  value={workHours}
                  onChange={(e) => setWorkHours(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              {canEdit && (
                <Button size="sm" onClick={saveGeneral} disabled={updateSetting.isPending}>
                  {updateSetting.isPending ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-md">
              {settingsLoading && (
                <p className="text-sm text-muted-foreground">Loading settings...</p>
              )}
              {settingsError && (
                <p className="text-sm text-destructive">Failed to load settings.</p>
              )}

              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>Registration Number</Label>
                <Input
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              {canEdit && (
                <Button size="sm" onClick={saveCompany} disabled={updateSetting.isPending}>
                  {updateSetting.isPending ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader><CardTitle className="text-base">User Roles</CardTitle></CardHeader>
            <CardContent className="pt-4">
              {rolesLoading && (
                <p className="text-sm text-muted-foreground mb-4">Loading user roles...</p>
              )}
              {rolesError && (
                <p className="text-sm text-destructive mb-4">Failed to load user roles.</p>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {r.user_id}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.role}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {!canEdit && (
                <p className="text-xs text-muted-foreground mt-3">
                  Only the System Administrator can modify settings and role assignments.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
