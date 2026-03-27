// lib/pdf.ts-Gerador de relatórios PDF clínicos para o HGU

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Consultation, User, UrgencyLevel } from '@/types'

const CORES = {
  verde: [39, 174, 96] as [number, number, number],
  amarelo: [243, 156, 18] as [number, number, number],
  vermelho: [231, 76, 60] as [number, number, number],
  indefinido: [149, 165, 166] as [number, number, number],
  azul: [28, 100, 170] as [number, number, number],
  cinza: [100, 100, 100] as [number, number, number],
  cinzaClaro: [240, 240, 240] as [number, number, number],
}

function urgenciaLabel(u: UrgencyLevel): string {
  const map = {
    verde: 'VERDE-Não urgente',
    amarelo: 'AMARELO-Urgente (2–4h)',
    vermelho: 'VERMELHO-Emergência',
    indefinido: 'Indefinido',
  }
  return map[u]
}

function doencaLabel(d: string): string {
  const map: Record<string, string> = {
    paludismo: 'Paludismo (Malária)',
    tuberculose: 'Tuberculose',
    diarreia: 'Doença diarreica',
    saude_materna: 'Saúde materno-infantil',
    outro: 'Outro / a determinar',
  }
  return map[d] || d
}

export async function gerarRelatorioPDF(
  consulta: Consultation,
  profissional: User,
  resumoIA: string
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = margin

  // ── Cabeçalho institucional ──────────────────────────────────
  doc.setFillColor(...CORES.azul)
  doc.rect(0, 0, W, 32, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('HOSPITAL GERAL DO UÍGE', margin, 12)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Ministério da Saúde de Angola · Província do Uíge', margin, 19)
  doc.text('Sistema de Apoio ao Diagnóstico com IA', margin, 25)

  // Data e número do relatório
  doc.setFontSize(9)
  const dataGerado = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: pt })
  doc.text(`Gerado em: ${dataGerado}`, W - margin, 19, { align: 'right' })
  doc.text(`Ref.: ${consulta.id.slice(0, 8).toUpperCase()}`, W - margin, 25, { align: 'right' })

  y = 40

  // ── Faixa de urgência ────────────────────────────────────────
  const corUrgencia = CORES[consulta.urgency] || CORES.indefinido
  doc.setFillColor(...corUrgencia)
  doc.rect(margin, y, W - 2 * margin, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(
    `NÍVEL DE URGÊNCIA: ${urgenciaLabel(consulta.urgency)}`,
    W / 2,
    y + 6.5,
    { align: 'center' }
  )
  y += 16

  // ── Dados do doente e profissional ──────────────────────────
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('1. IDENTIFICAÇÃO', margin, y)
  y += 6

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [],
    body: [
      ['Código do Doente', consulta.patientCode, 'Profissional', profissional.nome],
      [
        'Sexo / Idade',
        `${consulta.patientSex || '—'} / ${consulta.patientAge ? consulta.patientAge + ' anos' : '—'}`,
        'Função',
        profissional.role,
      ],
      [
        'Município',
        consulta.municipio,
        'Departamento',
        profissional.departamento,
      ],
      [
        'Data da consulta',
        format(
          consulta.createdAt instanceof Date
            ? consulta.createdAt
            : (consulta.createdAt as any).toDate?.() || new Date(),
          "dd/MM/yyyy HH:mm"
        ),
        'Hospital',
        'Hospital Geral do Uíge',
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: CORES.cinzaClaro, cellWidth: 38 },
      1: { cellWidth: 52 },
      2: { fontStyle: 'bold', fillColor: CORES.cinzaClaro, cellWidth: 38 },
      3: { cellWidth: 52 },
    },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ── Doenças suspeitas ────────────────────────────────────────
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('2. HIPÓTESES DIAGNÓSTICAS', margin, y)
  y += 6

  const doencasRows = consulta.suspectedDiseases.map((d, i) => [
    `${i + 1}º`,
    doencaLabel(d),
    i === 0 ? 'Principal' : 'Diferencial',
  ])

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Ord.', 'Doença / Condição', 'Classificação']],
    body: doencasRows.length > 0 ? doencasRows : [['—', 'A determinar com mais dados', '—']],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: CORES.azul, textColor: 255 },
    alternateRowStyles: { fillColor: CORES.cinzaClaro },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ── Resumo gerado pela IA ────────────────────────────────────
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('3. ANÁLISE CLÍNICA (ASSISTIDA POR IA)', margin, y)
  y += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)

  const linhas = doc.splitTextToSize(resumoIA, W - 2 * margin)
  doc.text(linhas, margin, y)
  y += linhas.length * 5 + 6

  // ── Histórico da conversa (resumido) ──────────────────────────
  if (y < 220) {
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('4. REGISTO DA CONSULTA', margin, y)
    y += 6

    const msgRows = consulta.messages
      .filter((m) => m.role !== 'system')
      .slice(-10) // últimas 10 mensagens
      .map((m) => [
        m.role === 'user' ? 'Profissional' : 'IA Clínica',
        m.content.slice(0, 200) + (m.content.length > 200 ? '...' : ''),
      ])

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Origem', 'Mensagem']],
      body: msgRows,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: CORES.cinza, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold' },
        1: { cellWidth: W - 2 * margin - 28 },
      },
    })
  }

  // ── Rodapé ────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pageH = doc.internal.pageSize.getHeight()

    doc.setDrawColor(...CORES.cinza)
    doc.setLineWidth(0.3)
    doc.line(margin, pageH - 18, W - margin, pageH - 18)

    doc.setFontSize(8)
    doc.setTextColor(...CORES.cinza)
    doc.setFont('helvetica', 'italic')
    doc.text(
      'AVISO: Este relatório foi gerado com apoio de inteligência artificial e NÃO substitui o julgamento clínico do profissional de saúde.',
      margin,
      pageH - 13
    )
    doc.text(
      'O diagnóstico definitivo é da responsabilidade exclusiva do médico assistente.',
      margin,
      pageH - 9
    )
    doc.text(`Página ${i} de ${totalPages}`, W - margin, pageH - 9, { align: 'right' })
  }

  return doc.output('blob')
}
