import { GroupMember } from "../../../features/group-info";

export interface GroupChat {
    groupName: string;
    image: string;
    description: string;
    admin: string;
    users: string[];
    groupId: string;
    members: GroupMember[]
}