import { useNavigate, useParams } from "react-router-dom";
import ChecklistPage from "./ChecklistPage";
import { Button } from "../components/ui/primitives";
import { useGlobal, useToast } from "../state/context";
import { customStandardId, describeStandard } from "../standards";
import { isAdmin } from "../permissions";

export default function CustomStandardPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, customStandards, deleteCustomStandard } = useGlobal();
  const standardId = customStandardId(slug);
  const { name } = describeStandard(standardId, customStandards);

  const handleDelete = async () => {
    if (!window.confirm(`Delete the entire "${name}" standard? This removes every clause and its evidence links. This cannot be undone.`)) return;
    try {
      await deleteCustomStandard(slug);
      toast.success(`Deleted ${name}`);
      navigate("/");
    } catch (err) {
      toast.error(`Couldn't delete standard: ${err.message}`);
    }
  };

  return (
    <ChecklistPage
      key={standardId}
      standardId={standardId}
      actions={isAdmin(user) && <Button variant="outline" icon="trash" onClick={handleDelete}>Delete standard</Button>}
    />
  );
}
