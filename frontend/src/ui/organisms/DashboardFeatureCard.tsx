"use client"
import React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, Box, Typography } from "@mui/material"

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
      onClick={() => router.push(route)}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        border: 0,
        cursor: 'pointer',
        transition: 'transform 300ms, box-shadow 300ms',
        backgroundColor: 'var(--color-bg-secondary)',
        '&:hover': {
          transform: 'scale(1.03)',
          boxShadow: 24,
        },
      }}
    >
      {/* Background pattern overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          transition: 'opacity 300ms',
          backgroundColor: 'var(--color-bg-tertiary)',
          pointerEvents: 'none',
          '.MuiCard-root:hover &': { opacity: 1 },
        }}
      />

      {/* Subtle grid pattern */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.1,
          pointerEvents: 'none',
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <CardContent sx={{ position: 'relative', p: 4, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
          <Box sx={{ color: `var(--color-accentuation-${color})`, transition: 'transform 300ms' }}>
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<any>, {
                  style: { fontSize: '4rem' },
                })
              : icon}
          </Box>
          <Typography variant="h5" fontWeight={800} color="text.primary">
            {title}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default DashboardFeatureCard
