"use client"
import React from "react"
import { useRouter } from "next/navigation"
import { Card, Box, Text, Group, ThemeIcon } from "@mantine/core"

export interface DashboardFeatureCardProps {
  title: string
  route: string
  icon: React.ReactNode
  description?: string
  stats?: string
  index?: number
}

const accentuationColors = [
  'blue', 'violet', 'green', 'orange', 'yellow', 
  'teal', 'indigo', 'pink', 'red', 'cyan'
]

export const DashboardFeatureCard: React.FC<DashboardFeatureCardProps> = ({
  title,
  route,
  icon,
  description,
  stats,
  index = 0,
}) => {
  const router = useRouter()
  const color = accentuationColors[index % accentuationColors.length] as any

  return (
    <Card
      shadow="sm"
      padding="xl"
      radius="md"
      withBorder
      onClick={() => router.push(route)}
      style={{
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '180px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
      className="dashboard-card"
      styles={{
        root: {
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 'var(--mantine-shadow-lg)',
          },
        },
      }}
    >
      {/* Background pattern */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          pointerEvents: 'none',
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.2'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <Group justify="center" style={{ position: 'relative', zIndex: 1 }}>
        <Box ta="center">
          <ThemeIcon
            size={80}
            radius="xl"
            variant="light"
            color={color}
            mb="md"
            style={{
              transition: 'transform 0.3s ease',
            }}
            className="dashboard-card-icon"
          >
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<any>, {
                  style: { width: '40px', height: '40px' },
                })
              : icon}
          </ThemeIcon>
          
          <Text size="xl" fw={700} mb={stats ? 'xs' : 0}>
            {title}
          </Text>
          
          {stats && (
            <Text size="sm" c="dimmed">
              {stats}
            </Text>
          )}

          {description && (
            <Text size="xs" c="dimmed" mt="xs">
              {description}
            </Text>
          )}
        </Box>
      </Group>

      <style jsx global>{`
        .dashboard-card:hover .dashboard-card-icon {
          transform: scale(1.1);
        }
      `}</style>
    </Card>
  )
}

export default DashboardFeatureCard
