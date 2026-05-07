import classes from "./main.module.css";

function Main({ children }) {
  return <main className={classes.main}>{children}</main>;
}

export default Main;
