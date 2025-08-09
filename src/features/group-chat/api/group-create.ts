export interface GroupCreateRequest {
    GroupName: string;
    Description: string;
    Admin: string;
    Users: string[];
    ImageFile: File | null | undefined;
}