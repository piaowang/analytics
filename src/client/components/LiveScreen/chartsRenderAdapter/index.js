import DataFilterControl from './dataFilterControl'
import {ImageContent} from './image'
import LineText from './line-text'
import {ThemePicker} from './theme-picker'
import {Frame} from './iframe'
import Blank from './blank'
import VideoComponent from './video-component'
import {DropDownPopover} from './dropDownPopover'
import {InspectSliceBtn} from './inspectSliceBtn'
import {BackBtn} from './backBtn'

export const ChartsRenderAdapter = {
  blank: Blank,
  line_text: LineText,
  image: ImageContent,
  video: VideoComponent,
  theme_picker: ThemePicker,
  frame: Frame,
  data_filter_control: DataFilterControl,
  drop_down_popover: DropDownPopover,
  inspect_slice_btn: InspectSliceBtn,
  back_btn: BackBtn
}
