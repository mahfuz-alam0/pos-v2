"use client";

import { useEffect, useState } from "react";
import WelcomeBanner from "@/components/dashboard/WelcomeBanner";
import RevenueBreakdownCard from "@/components/dashboard/RevenueBreakdownCard";
import ShopDashboardStats from "@/components/dashboard/ShopDashboardStats";
import TotalRevenueCard from "@/components/dashboard/TotalRevenueCard";
import PopularTimeCard from "@/components/dashboard/PopularTimeCard";
import ConversionStats from "@/components/dashboard/ConversionStats";
import AllStatsTiles from "@/components/dashboard/AllStatsTiles";
import CustomerQueue from "@/components/dashboard/CustomerQueue";
import EmployeeSalesTodayChart from "@/components/dashboard/EmployeeSalesTodayChart";
import TaskList from "@/components/dashboard/TaskList";
import MetrcAlerts from "@/components/dashboard/MetrcAlerts";
import RegistersPanel from "@/components/dashboard/RegistersPanel";

function readUserInfo() {
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "null");
  } catch {
    return null;
  }
}

export default function Home() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [hasMetrcReporting, setHasMetrcReporting] = useState(false);

  useEffect(() => {
    const orgFeatureScopes = readUserInfo()?.orgFeatureScopes || [];
    setHasMetrcReporting(orgFeatureScopes.includes("METRC_REPORTING"));
  }, []);

  return (
    <div className="flex flex-col gap-5 p-6">
      <WelcomeBanner />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <RevenueBreakdownCard />
        <ShopDashboardStats />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <TotalRevenueCard />
        <PopularTimeCard />
        <ConversionStats />
      </div>

      <AllStatsTiles />

      <CustomerQueue />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-5">
          <EmployeeSalesTodayChart employeeId={selectedEmployeeId} onEmployeeChange={setSelectedEmployeeId} />
          <TaskList />
          {hasMetrcReporting && <MetrcAlerts />}
        </div>

        <div>
          <RegistersPanel />
        </div>
      </div>
    </div>
  );
}
