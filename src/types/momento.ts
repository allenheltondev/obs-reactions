export interface TopicResponse {
  items: TopicItemContainer[];
}
export interface TopicItemContainer {
  item: TopicItem;
}

export interface TopicItem {
  topic_sequence_number: number;
  value: TopicMessage;
  sequence_page: number;
}

export interface TopicMessage {
  text: string;
}
