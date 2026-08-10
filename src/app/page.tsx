"use client";

import { useEffect, useState } from "react";
import { usePermission } from "@/util/use-permission";
import { useCurrentUser } from "@/util/use-current-user";
import WelcomeBanner from "@/components/dashboard/WelcomeBanner";
import RevenueBreakdownCard from "@/components/dashboard/RevenueBreakdownCard";
import ShopDashboardStats from "@/components/dashboard/ShopDashboardStats";
import TotalRevenueCard from "@/components/dashboard/TotalRevenueCard";
import PopularTimeCard from "@/components/dashboard/PopularTimeCard";
import ConversionStats from "@/components/dashboard/ConversionStats";
import AllStatsTiles from "@/components/dashboard/AllStatsTiles";
import CustomerQueue from "@/components/dashboard/CustomerQueue";
import EmployeeSalesTodayChart from "@/components/dashboard/EmployeeSalesTodayChart";
import SpiffsCampaigns from "@/components/dashboard/SpiffsCampaigns";
import TaskList from "@/components/dashboard/TaskList";
import MetrcAlerts from "@/components/dashboard/MetrcAlerts";
import RegistersPanel from "@/components/dashboard/RegistersPanel";

export default function Home() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [hasMetrcReporting, setHasMetrcReporting] = useState(false);
  const { checkPermission } = usePermission();
  const canViewDashboardStats = checkPermission("DASHBOARD");
  const currentUser = useCurrentUser();

  useEffect(() => {
    const orgFeatureScopes = currentUser?.orgFeatureScopes || [];
    setHasMetrcReporting(orgFeatureScopes.includes("METRC_REPORTING"));
  }, [currentUser]);

  return (
    <div className="flex flex-col gap-3 p-4">
      <WelcomeBanner />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueBreakdownCard />
        </div>
        {canViewDashboardStats && <ShopDashboardStats />}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {canViewDashboardStats && <TotalRevenueCard />}
        <PopularTimeCard />
        <ConversionStats />
      </div>

      {canViewDashboardStats && <AllStatsTiles />}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr]">
        <CustomerQueue />
        <RegistersPanel />
      </div>

      <div className="flex flex-col gap-3">
        {canViewDashboardStats && (
          <EmployeeSalesTodayChart employeeId={selectedEmployeeId} onEmployeeChange={setSelectedEmployeeId} />
        )}
        <SpiffsCampaigns />
        <TaskList />
        {hasMetrcReporting && <MetrcAlerts />}
      </div>
    </div>
  );
}
