"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Clock, TrendingUp, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function PeakHoursAnalysis({ results }: { results: any[] }) {
  // Simulate hourly demand (in real app, get from API)
  const hourlyData = [
    { hour: "6 AM", demand: 45, isPeak: false },
    { hour: "7 AM", demand: 85, isPeak: true },
    { hour: "8 AM", demand: 120, isPeak: true },
    { hour: "9 AM", demand: 95, isPeak: true },
    { hour: "10 AM", demand: 60, isPeak: false },
    { hour: "11 AM", demand: 50, isPeak: false },
    { hour: "12 PM", demand: 70, isPeak: false },
    { hour: "1 PM", demand: 65, isPeak: false },
    { hour: "2 PM", demand: 55, isPeak: false },
    { hour: "3 PM", demand: 75, isPeak: false },
    { hour: "4 PM", demand: 90, isPeak: true },
    { hour: "5 PM", demand: 130, isPeak: true },
    { hour: "6 PM", demand: 115, isPeak: true },
    { hour: "7 PM", demand: 80, isPeak: false },
    { hour: "8 PM", demand: 50, isPeak: false }
  ];

  const peakHours = hourlyData.filter(h => h.isPeak);
  const avgPeakDemand = Math.round(peakHours.reduce((sum, h) => sum + h.demand, 0) / peakHours.length);
  const avgOffPeakDemand = Math.round(
    hourlyData.filter(h => !h.isPeak).reduce((sum, h) => sum + h.demand, 0) / 
    hourlyData.filter(h => !h.isPeak).length
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock size={18} className="text-blue-600" />
          Peak Hours Analysis
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Demand patterns throughout the day
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-red-600" size={16} />
              <p className="text-xs font-medium text-red-700">Peak Hours</p>
            </div>
            <p className="text-xl font-bold text-red-700">7-9 AM, 4-6 PM</p>
            <p className="text-xs text-red-600 mt-1">Avg: {avgPeakDemand} passengers</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <Users className="text-green-600" size={16} />
              <p className="text-xs font-medium text-green-700">Off-Peak</p>
            </div>
            <p className="text-xl font-bold text-green-700">10 AM - 3 PM</p>
            <p className="text-xs text-green-600 mt-1">Avg: {avgOffPeakDemand} passengers</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-blue-600" size={16} />
              <p className="text-xs font-medium text-blue-700">Peak Increase</p>
            </div>
            <p className="text-xl font-bold text-blue-700">
              +{Math.round(((avgPeakDemand - avgOffPeakDemand) / avgOffPeakDemand) * 100)}%
            </p>
            <p className="text-xs text-blue-600 mt-1">vs off-peak</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="hour" 
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(value) => [`${value} passengers`, 'Demand']}
            />
            <Bar dataKey="demand" radius={[4, 4, 0, 0]}>
              {hourlyData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isPeak ? "#ef4444" : "#10b981"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
