import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SettingsPage = () => {
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
              <div className="space-y-2">
                <Label>System Name</Label>
                <Input defaultValue="HRMS Enterprise" />
              </div>
              <div className="space-y-2">
                <Label>Default Timezone</Label>
                <Input defaultValue="UTC+8" />
              </div>
              <div className="space-y-2">
                <Label>Work Hours Per Day</Label>
                <Input defaultValue="8" type="number" />
              </div>
              <Button size="sm">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input defaultValue="Acme Corporation" />
              </div>
              <div className="space-y-2">
                <Label>Registration Number</Label>
                <Input defaultValue="REG-2020-001234" />
              </div>
              <Button size="sm">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground text-sm py-12">
              Role & permission management will be available once connected to a backend.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
