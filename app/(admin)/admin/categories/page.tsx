import { listCategoriesAction } from "@/app/actions/categories";
import CategoriesClient from "./CategoriesClient";

export default async function CategoriesPage() {
  const categories = await listCategoriesAction();
  return <CategoriesClient initialCategories={categories} />;
}
