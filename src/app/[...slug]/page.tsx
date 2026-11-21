import { DemoPages } from "@/components/demo-pages";

export default async function RoutedDemoPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <DemoPages path={slug.join("/")} />;
}
