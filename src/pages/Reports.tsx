import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";

export default function Reports() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Leave and attendance reports. More report types can be added here."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave report
            </CardTitle>
            <CardDescription>Summary of leave requests, balances, and approvals by period.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Coming soon — filters by date range, department, and leave type.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance report
            </CardTitle>
            <CardDescription>Attendance summary, late/early, and overtime by period.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Coming soon — filters by date range, department, and status.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
