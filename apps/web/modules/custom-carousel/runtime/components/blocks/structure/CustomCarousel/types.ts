import type { Block } from '@plentymarkets/shop-api';

export type CarouselStructureProps = {
  name: string;
  type: string;
  content: Block[];
  configuration: {
    controls: {
      color: string;
      displayArrows: boolean;
    };
    layout?: {
      fullWidth?: boolean;
      fullHeight?: boolean;
    };
  };
  index: number;
  meta: {
    uuid: string;
  };
};
