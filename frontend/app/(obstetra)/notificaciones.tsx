import React from 'react';
import { NotificationsScreen } from '../../src/components/shared/NotificationsScreen';
import { obstetraColors } from '../../src/theme/colors';

export default function NotificacionesObstetra(): React.ReactElement {
  return <NotificationsScreen role="obstetra" themeColor={obstetraColors.primary} gradient={obstetraColors.gradient} />;
}
