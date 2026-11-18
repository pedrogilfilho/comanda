// Filtro de mesa das contas fechadas: as mesas do período (numeradas em ordem) e a mesa
// escolhida, que volta para "todas" ('') quando some do período ao trocar a data
export function tableFilter(accounts: { tableIdentifier: string }[], selected: string) {
  const options = [...new Set(accounts.map((a) => a.tableIdentifier))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { numeric: true }),
  );
  return { options, active: options.includes(selected) ? selected : '' };
}
