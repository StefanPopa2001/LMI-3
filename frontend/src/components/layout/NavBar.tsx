'use client';
import React, { useState, useEffect } from 'react';
import {
  AppShell,
  Burger,
  Group,
  Title,
  NavLink,
  Stack,
  Box,
  Text,
  Avatar,
  Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard,
  IconUsers,
  IconUsersGroup,
  IconSchool,
  IconCalendarEvent,
  IconChartBar,
  IconCloud,
  IconSettings,
  IconRepeat,
  IconLogout,
  IconShield,
} from '@tabler/icons-react';
import { useRouter, usePathname } from 'next/navigation';
import authService from '../../services/authService';

interface NavBarProps {
  children: React.ReactNode;
}

export default function NavBarLayout({ children }: NavBarProps) {
  const [opened, { toggle, close }] = useDisclosure();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  const currentUser = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: IconDashboard, href: '/dashboard' },
    { label: 'Utilisateurs', icon: IconUsers, href: '/users' },
    { label: 'Étudiants', icon: IconUsersGroup, href: '/users/crud' },
    { label: 'Classes', icon: IconSchool, href: '/classes' },
    { label: 'Présences', icon: IconCalendarEvent, href: '/attendance' },
    { label: 'RR', icon: IconRepeat, href: '/rr' },
    { label: 'Statistiques', icon: IconChartBar, href: '/stats' },
  ];

  const adminItems = [
    { label: 'Settings', icon: IconSettings, href: '/settings' },
    { label: 'Drive', icon: IconCloud, href: '/drive' },
  ];

  if (!mounted) return null;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title
              order={3}
              style={{ 
                cursor: 'pointer',
                fontFamily: 'var(--font-montserrat)',
                letterSpacing: '0.5px',
              }}
              c="blue.6"
              onClick={() => router.push('/dashboard')}
            >
              <Text hiddenFrom="sm" inherit>LMI3</Text>
              <Text visibleFrom="sm" inherit>Logiscool Mons Intranet III</Text>
            </Title>
          </Group>
          {currentUser?.admin && (
            <IconShield size={24} color="var(--mantine-color-dimmed)" />
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section>
          <Stack gap="xs">
            {currentUser && (
              <Box p="sm" style={{ 
                borderRadius: 'var(--mantine-radius-md)',
                backgroundColor: 'var(--mantine-color-dark-6)',
              }}>
                <Group>
                  <Avatar color="blue" radius="xl">
                    {currentUser.prenom?.[0]}{currentUser.nom?.[0]}
                  </Avatar>
                  <Box style={{ flex: 1 }}>
                    <Text size="sm" fw={600}>
                      {currentUser.prenom} {currentUser.nom}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {currentUser.email}
                    </Text>
                  </Box>
                </Group>
              </Box>
            )}
          </Stack>
        </AppShell.Section>

        <Divider my="md" />

        <AppShell.Section grow>
          <Stack gap={4}>
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                leftSection={<item.icon size={20} />}
                active={pathname === item.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(item.href);
                }}
                style={{ borderRadius: 'var(--mantine-radius-md)' }}
              />
            ))}

            {currentUser?.admin && (
              <>
                <Divider my="sm" label="Administration" labelPosition="center" />
                {adminItems.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    leftSection={<item.icon size={20} />}
                    active={pathname === item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(item.href);
                    }}
                    style={{ borderRadius: 'var(--mantine-radius-md)' }}
                  />
                ))}
              </>
            )}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <NavLink
            label="Déconnexion"
            leftSection={<IconLogout size={20} />}
            onClick={handleLogout}
            color="red"
            style={{ borderRadius: 'var(--mantine-radius-md)' }}
          />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
