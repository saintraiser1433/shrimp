"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type MultiBarChartDataPoint = { name: string; [key: string]: string | number };

type MultiBarChartCardProps = {
  title: string;
  data: MultiBarChartDataPoint[];
  bars: { dataKey: string; color: string; name?: string }[];
};

export function MultiBarChartCard({ title, data, bars }: MultiBarChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                }}
                labelStyle={{ color: "var(--popover-foreground)" }}
              />
              <Legend />
              {bars.map((b) => (
                <Bar
                  key={b.dataKey}
                  dataKey={b.dataKey}
                  name={b.name ?? b.dataKey}
                  fill={b.color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
