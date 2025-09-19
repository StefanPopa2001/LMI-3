"use client"
import React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@mui/material"

export interface DashboardFeatureCardProps {
  title: string
  route: string
  icon: React.ReactNode
  description?: string
  stats?: string
  index?: number
}

const accentuationColors = ['blue', 'purple', 'green', 'orange', 'yellow', 'teal', 'indigo', 'pink', 'red', 'cyan']

export const DashboardFeatureCard: React.FC<DashboardFeatureCardProps> = ({
  title,
  route,
  icon,
  description,
  stats,
  index = 0,
}) => {
  const router = useRouter()
  const color = accentuationColors[index % accentuationColors.length]

  return (
    <Card
      className="group relative overflow-hidden border-0 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      onClick={() => router.push(route)}
    >
      {/* Background pattern overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23000000' fillOpacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <CardContent className="relative p-8 h-40 flex flex-col justify-center">
        {/* Icon and title section */}
        <div className="flex flex-col items-center text-center space-y-6">
          <div style={{ color: `var(--color-accentuation-${color})` }} className="transform group-hover:scale-110 transition-transform">
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<any>, {
                  className: "w-16 h-16",
                  style: { fontSize: "4rem" },
                })
              : icon}
          </div>

          <h3 style={{ color: 'var(--color-text-primary)' }} className="text-3xl font-bold transition-colors duration-300">
            {title}
          </h3>
        </div>
      </CardContent>
    </Card>
  )
}

export default DashboardFeatureCard
