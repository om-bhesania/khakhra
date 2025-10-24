import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface CustomDialougeProps {
  trigger: string | React.ReactElement;
  dialogTitle?: string;
  dialogDescription: string | React.ReactElement;
}

const CustomDialouge: React.FC<CustomDialougeProps> = ({
  trigger = "open",
  dialogTitle = "",
  dialogDescription = "This action cannot be undone. This will permanently delete your  account and remove your data from our servers.",
}) => {
  return (
    <Dialog>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="!max-w-3xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription className="!h-[450px]  overflow-y-auto">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default CustomDialouge;
