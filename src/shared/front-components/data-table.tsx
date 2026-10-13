import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { type DataTableColumn } from 'src/shared/front-components/types/data-table-column.type';

export const DataTable = <TRow,>({
  columns,
  rows,
  rowKey,
}: {
  columns: DataTableColumn<TRow>[];
  rows: TRow[];
  rowKey: (row: TRow, index: number) => string;
}) => {
  const styles = readPopUpStyles();

  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} style={styles.headerCell}>
              {column.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={rowKey(row, index)}>
            {columns.map((column) => (
              <td key={column.key} style={styles.cell}>
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
