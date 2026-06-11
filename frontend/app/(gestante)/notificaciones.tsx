import React from 'react';
import { NotificationsScreen } from '../../src/components/shared/NotificationsScreen';
import { gestanteColors } from '../../src/theme/colors';

export default function NotificacionesGestante(): React.ReactElement {
  return <NotificationsScreen themeColor={gestanteColors.primary} />;
}
