export interface OtoMessageResponse {
    messageId: string;
    sender: string;
    recipient: string;
    content: string;
    sentAt: Date;
}