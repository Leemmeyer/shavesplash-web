import BrandItemAdminPage from "@/components/admin/BrandItemAdminPage";

export default function AftersahvesPage() {
  return (
    <BrandItemAdminPage
      apiPath="/api/admin/aftershave-brands"
      title="Aftershave Brands"
      itemLabel="Scents / Products"
    />
  );
}
