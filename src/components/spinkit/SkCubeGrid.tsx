import { cn } from "@/lib/utils";
import styles from "./SkCubeGrid.module.css";

const SkCubeGrid = () => {
  return (
    <div className={styles["sk-cube-grid"]}>
      <div className={cn(styles["sk-cube"], styles["sk-cube1"])}></div>
      <div className={cn(styles["sk-cube"], styles["sk-cube2"])}></div>
      <div className={cn(styles["sk-cube"], styles["sk-cube3"])}></div>
      <div className={cn(styles["sk-cube"], styles["sk-cube4"])}></div>
      <div className={cn(styles["sk-cube"], styles["sk-cube5"])}></div>
      <div className={cn(styles["sk-cube"], styles["sk-cube6"])}></div>
      <div className={cn(styles["sk-cube"], styles["sk-cube7"])}></div>
      <div className={cn(styles["sk-cube"], styles["sk-cube8"])}></div>
      <div className={cn(styles["sk-cube"], styles["sk-cube9"])}></div>
    </div>
  );
};

export default SkCubeGrid;
