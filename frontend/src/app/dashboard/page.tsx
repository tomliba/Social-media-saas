import NotificationBanner from "@/components/dashboard/NotificationBanner";
import CalendarHeader from "@/components/dashboard/CalendarHeader";
import ContentCalendarGrid from "@/components/dashboard/ContentCalendarGrid";
import FloatingActionBar from "@/components/dashboard/FloatingActionBar";

export default function DashboardPage() {
  return (
    <>
      <NotificationBanner />
      <CalendarHeader />
      <ContentCalendarGrid />
      <FloatingActionBar />
    </>
  );
}
