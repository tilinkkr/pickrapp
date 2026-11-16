import { Text, View } from 'react-native';

import { DuoIcon } from '@/components/ui/duo-icon';
import type { LucideIcon } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';

/** An intentional "nothing here yet" state, not an error. */
export function EmptyState({ icon, title, body }: { icon: LucideIcon; title: string; body?: string }) {
  const Brand = useBrand();
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}>
        <DuoIcon icon={icon} size={28} color={Brand.text} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body && <Text style={styles.body}>{body}</Text>}
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  wrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.text,
  },
  body: {
    maxWidth: 300,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: Brand.muted,
  },
}));
