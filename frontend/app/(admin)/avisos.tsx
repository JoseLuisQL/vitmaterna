import React from 'react';
import { NotificationsScreen } from '../../src/components/shared/NotificationsScreen';
import { adminColors } from '../../src/theme/colors';

/** Bandeja de avisos de sistema del administrador (in-app). */
export default function AvisosAdmin(): React.ReactElement {
  return <NotificationsScreen role="admin" themeColor={adminColors.primary} gradient={adminColors.gradient} />;
}
