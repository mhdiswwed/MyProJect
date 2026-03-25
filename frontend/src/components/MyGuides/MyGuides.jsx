import MyTasks from "../components/MyTasks/MyTasks";
import MyGuides from "../components/MyGuides/MyGuides";

{
  /* משימות שלי – רק לעובד*/
}
<Route
  path="/myTasks"
  element={
    <RequireAuth isAuth={isAuth}>
      <MyTasks user={user} />
    </RequireAuth>
  }
/>;
{
  /* הדרכות – רק למדריך */
}
<Route
  path="/myGuides"
  element={
    <RequireAuth isAuth={isAuth}>
      <MyGuides user={user} />
    </RequireAuth>
  }
/>;