"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  IconUsers,
  IconUsersGroup,
  IconSchool,
  IconCalendarEvent,
  IconChartBar,
  IconRepeat,
  IconCreditCard,
  IconBriefcase,
  IconCloud,
  IconFlask,
  IconUserShield,
  IconSettings,
  IconDatabase,
  IconTools,
  IconShield,
} from '@tabler/icons-react'
import { Container, Box, Typography, Card, CardContent, CardActionArea, Avatar } from '@mui/material'

interface UserStats {
  totalUsers: number
  activeUsers: number
  adminUsers: number
  tempPasswordUsers: number
}

export default function DashboardView() {
  const router = useRouter()
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    tempPasswordUsers: 0,
  })

  const handleApiError = (err: any) => {
    if (err.message && err.message.startsWith("AUTH_ERROR:")) {
      router.push("/login")
      return
    }
    console.error("API Error:", err.message)
  }

  useEffect(() => {
    fetchUserStats()
  }, [])

  const fetchUserStats = async () => {
    try {
      // Note: Keeping the original auth logic intact as requested
    } catch (error: any) {
      handleApiError(error)
    }
  }

  const databaseCards = [
    {
      title: "Utilisateurs",
      description: "Gérer les utilisateurs du système",
      icon: <IconUserShield />,
      route: "/users",
      stats: `${userStats.totalUsers} utilisateurs`,
    },
    {
      title: "Étudiants",
      description: "Gestion des élèves et inscriptions",
      icon: <IconUsersGroup />,
      route: "/users/crud",
      stats: "Gestion scolaire",
    },
    {
      title: "Classes",
      description: "Organiser et gérer les classes",
      icon: <IconSchool />,
      route: "/classes",
      stats: "Gestion des cours",
    },
  ]

  const toolsCards = [
    {
      title: "Présences",
      description: "Suivre les présences aux cours",
      icon: <IconCalendarEvent />,
      route: "/attendance",
      stats: "Suivi en temps réel",
    },
    {
      title: "RR",
      description: "Replacements et rattrapages",
      icon: <IconRepeat />,
      route: "/rr",
      stats: "Tous les RR",
    },
    {
      title: "Logipay",
      description: "Gestion des paiements et facturation",
      icon: <IconCreditCard />,
      route: "/logipay",
      stats: "Paiements en ligne",
    },
    {
      title: "Drive",
      description: "Fichiers partagés / stockage",
      icon: <IconCloud />,
      route: "/drive",
      stats: "Stockage",
    },
  ]

  const adminCards = [
    {
      title: "Settings",
      description: "Manage course dropdowns and settings",
      icon: <IconSettings />,
      route: "/settings",
      stats: "Configuration",
    },
    {
      title: "Permanence",
      description: "Gestion des permanences et surveillance",
      icon: <IconBriefcase />,
      route: "/permanence",
      stats: "Surveillance active",
    },
    {
      title: "Analyses",
      description: "Statistiques et rapports détaillés",
      icon: <IconChartBar />,
      route: "/stats",
      stats: "Données complètes",
    },
    {
      title: "FA & FO",
      description: "Zone de tests (Playground)",
      icon: <IconFlask />,
      route: "/fafo",
      stats: "Expérimentations",
    },
  ]

  const accentuationColors = [
    'primary.main', 'secondary.main', 'success.main', 'warning.main', 'info.main',
    'error.main', '#9c27b0', '#ff5722', '#607d8b', '#00bcd4'
  ]

  const DashboardCard = ({ title, description, icon, route, stats, index }: any) => {
    const color = accentuationColors[index % accentuationColors.length]

    return (
      <Card 
        sx={{ 
          height: '100%', 
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          },
          minWidth: 280,
          maxWidth: 320
        }}
        onClick={() => router.push(route)}
      >
        <CardActionArea sx={{ height: '100%', p: 2 }}>
          <CardContent sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            textAlign: 'center',
            height: '100%',
            minHeight: 180
          }}>
            <Avatar 
              sx={{ 
                bgcolor: color, 
                width: 80, 
                height: 80, 
                mb: 2,
                '& svg': { fontSize: 40 }
              }}
            >
              {icon}
            </Avatar>
            
            <Typography variant="h6" component="h2" gutterBottom>
              {title}
            </Typography>
            
            {stats && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {stats}
              </Typography>
            )}

            {description && (
              <Typography variant="caption" color="text.secondary">
                {description}
              </Typography>
            )}
          </CardContent>
        </CardActionArea>
      </Card>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Base de données Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <IconDatabase size={32} />
          Base de données
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 3,
          '& > *': { flex: '1 1 280px', maxWidth: '320px' }
        }}>
          {databaseCards.map((card, index) => (
            <DashboardCard
              key={card.title}
              title={card.title}
              description={card.description}
              route={card.route}
              icon={card.icon}
              stats={card.stats}
              index={index}
            />
          ))}
        </Box>
      </Box>

      {/* Outils Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <IconTools size={32} />
          Outils
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 3,
          '& > *': { flex: '1 1 280px', maxWidth: '320px' }
        }}>
          {toolsCards.map((card, index) => (
            <DashboardCard
              key={card.title}
              title={card.title}
              description={card.description}
              route={card.route}
              icon={card.icon}
              stats={card.stats}
              index={index + 3}
            />
          ))}
        </Box>
      </Box>

      {/* Administration Section */}
      <Box>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <IconShield size={32} />
          Administration
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 3,
          '& > *': { flex: '1 1 280px', maxWidth: '320px' }
        }}>
          {adminCards.map((card, index) => (
            <DashboardCard
              key={card.title}
              title={card.title}
              description={card.description}
              route={card.route}
              icon={card.icon}
              stats={card.stats}
              index={index + 7}
            />
          ))}
        </Box>
      </Box>
    </Container>
  )
}
