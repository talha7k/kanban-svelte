import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PlusCircle,
  FolderKanban,
  Loader2,
  Briefcase,
  Settings2,
  Eye,
  Crown,
  Pencil,
  Trash2,
  Users,
  Users2Icon,
  PlusIcon,
  PlusCircleIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Project, UserProfile } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
  currentUserUid: string | undefined;
  allUsers: UserProfile[];
  openEditProjectDialog: (project: Project) => void;
  openManageMembersDialog: (project: Project) => void;
  openDeleteProjectDialog: (project: Project) => void;
  openViewMembersDialog: (project: Project) => void;
}

export function ProjectCard({
  project,
  currentUserUid,
  allUsers,
  openEditProjectDialog,
  openManageMembersDialog,
  openDeleteProjectDialog,
  openViewMembersDialog,
}: ProjectCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleNavigateToProject = () => {
    startTransition(() => {
      router.push(`/projects/${project.id}`);
    });
  };

  return (
    <Card
      key={project.id}
      className="bg-gradient-to-r from-pink-100 to-white hover:shadow-lg transition-shadow  hover:bg-gradient-to-r hover:from-pink-200 hover:to-purple-100"
    >
      <CardHeader
        onClick={handleNavigateToProject}
        className="pb-3 cursor-pointer"
      >
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          {currentUserUid === project.ownerId && (
            <Badge variant="outline" className="ml-2 border-accent text-accent">
              <Crown className="mr-1.5 h-3.5 w-3.5" /> Owner
            </Badge>
          )}
        </div>
        <CardDescription
          onClick={handleNavigateToProject}
          className="line-clamp-2 min-h-[40px] break-words cursor-pointer"
        >
          {project.description || "No description available."}
          <div className="flex items-center space-x-2 mb-1">
            <span className="flex text-xs font-bold text-blue-400 mt-2">
              <Users2Icon className="mr-1.5 h-4 w-4" />{" "}
              {project.memberIds?.length || 0}
            </span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col justify-center items-center border-t ">
        
        <div className="flex flex-wrap gap-2 w-full mt-3 md:mt-0">
          
          {currentUserUid === project.ownerId && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditProjectDialog(project)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>{" "}
              <Button
                variant="outline"
                size="sm"
                onClick={() => openManageMembersDialog(project)}
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Members
              </Button>
            </>
          )}<Button
            variant="outline"
            size="sm"
            onClick={() => openViewMembersDialog(project)}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" /> Members
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
