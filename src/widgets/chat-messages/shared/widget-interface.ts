export interface BaseMessage {
    id?: string;
    messageId?: string;
    sender: string;
    isDeleted?: boolean;
    sendTime?: string | Date;
    sentAt?: string | Date;
    content: string;
  }
  
  export interface ParsedContent {
    text: string;
    files: any[];
  }
  
  export interface CachedParsedContent extends ParsedContent {
    timestamp: number;
    version: number;
  }