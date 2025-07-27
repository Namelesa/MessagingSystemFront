export interface GroupMessage {
  messageId: string;
  groupId: string;
  sender: string;
  content: string;
  sendTime: string; 
  isEdited: boolean;
  replyFor?: string;
} 