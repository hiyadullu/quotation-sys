import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/Feedback';
import { LinkButton } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <EmptyState icon={<Compass className="h-7 w-7" />} title="Page not found" action={<LinkButton to="/">Back to dashboard</LinkButton>}>
      The page you are looking for does not exist or has moved.
    </EmptyState>
  );
}
