import { GroupMember } from "../../../entities/group-member";

export interface GroupChat {
    groupName: string;
    image: string;
    description: string;
    admin: string;
    users: string[];
    groupId: string;
    members: GroupMember[]
}